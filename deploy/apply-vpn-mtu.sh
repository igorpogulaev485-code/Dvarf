#!/usr/bin/env bash
# TCP до VPS через мобильный VPN с дырявым PMTUD.
# Не фильтрует выходные IP VPN: только MSS и tcp_mtu_probing.
#
# Крупные пакеты идут от сервера (цепочка сертификатов, JS). Их размер задаёт
# MSS из входящего SYN клиента. Старые правила OUTPUT/POSTROUTING --sport
# урезали только пакеты клиента и здесь снимаются целиком.
# Входящий SYN клампится в mangle PREROUTING до DNAT Docker.
# Контейнер edge (Caddy) имеет свой netns: tcp_mtu_probing ему ставит compose.
#
# Аргументы iptables — в том порядке, в котором их печатает `iptables -S`:
# один `-m tcp`, и на нём и `--sport`, и `--tcp-flags`. Команда с `--sport`
# до отдельного `-m tcp` собирает другой match. `iptables -C` на неё отвечает
# «правила нет», хотя строка в `-S` уже есть, и каждый деплой делал ещё `-A`.
set -euo pipefail

# Строка ровно как `iptables -S` (предупреждение «# Warning» сюда не входит).
exact_rule_line() {
  local chain="$1"
  shift
  local line="-A ${chain}"
  local arg
  for arg in "$@"; do
    line+=" ${arg}"
  done
  printf '%s' "$line"
}

count_exact() {
  local table="$1"
  local chain="$2"
  shift 2
  local want
  want="$(exact_rule_line "$chain" "$@")"
  local n=0
  local line
  while IFS= read -r line; do
    [[ "$line" == "$want" ]] && n=$((n + 1))
  done < <(iptables -t "$table" -S "$chain" 2>/dev/null || true)
  printf '%s' "$n"
}

# Снять все копии одного правила. Чужие строки не трогает.
drop_exact() {
  local table="$1"
  local chain="$2"
  shift 2
  local n
  n="$(count_exact "$table" "$chain" "$@")"
  if [[ ! "$n" =~ ^[0-9]+$ ]]; then
    echo "WARN: не посчитали правила ${table}/${chain}"
    return 0
  fi
  if (( n > 2000 )); then
    echo "WARN: в ${table}/${chain} ${n} копий, за этот запуск снимаем 2000"
    n=2000
  fi
  local i
  for ((i = 0; i < n; i++)); do
    if ! iptables -t "$table" -D "$chain" "$@"; then
      echo "WARN: не снялась копия ${table}/${chain} ($((i + 1))/${n})"
      return 0
    fi
  done
  if (( n > 0 )); then
    echo "ok: снято ${n} копий ${table}/${chain}: $(exact_rule_line "$chain" "$@")"
  else
    echo "ok: старых правил ${table}/${chain} нет"
  fi
}

# Ровно одна копия. Нет правила — сначала `iptables -C`, и только потом `-A`.
# Лишние копии снимаются. Последняя остаётся на месте, заново её не вставляем.
ensure_one() {
  local table="$1"
  local chain="$2"
  shift 2
  local n
  n="$(count_exact "$table" "$chain" "$@")"
  if [[ ! "$n" =~ ^[0-9]+$ ]]; then
    n=0
  fi
  if (( n == 0 )); then
    if iptables -t "$table" -C "$chain" "$@" 2>/dev/null; then
      echo "ok: ${table}/${chain} уже есть"
      return 0
    fi
    iptables -t "$table" -A "$chain" "$@"
    echo "ok: ${table}/${chain} добавлено"
    return 0
  fi
  local extra=$((n - 1))
  if (( extra > 2000 )); then
    echo "WARN: в ${table}/${chain} ${n} копий, за этот запуск снимаем 2000 дублей"
    extra=2000
  fi
  local i
  for ((i = 0; i < extra; i++)); do
    if ! iptables -t "$table" -D "$chain" "$@"; then
      echo "WARN: не снялся дубль ${table}/${chain}"
      return 0
    fi
  done
  if (( extra > 0 )); then
    echo "ok: ${table}/${chain}: снято ${extra} дублей, осталась одна копия"
  else
    echo "ok: ${table}/${chain} уже одна копия"
  fi
}

apply_vpn_mtu() {
  echo "=== Dvarf VPN/MTU harden ==="

  local SYSCTL_FILE=/etc/sysctl.d/99-dvarf-vpn-mtu.conf
  cat >"$SYSCTL_FILE" <<'EOF'
# Mobile VPN tunnels often shrink MTU and drop ICMP "Fragmentation Needed".
# Without probing, large TCP segments blackhole → Safari white screen / stuck bar.
net.ipv4.tcp_mtu_probing = 1
EOF
  sysctl -p "$SYSCTL_FILE" >/dev/null
  sysctl net.ipv4.tcp_mtu_probing

  local sport
  for sport in 80 443; do
    drop_exact mangle OUTPUT -p tcp -m tcp --sport "$sport" --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1360
    drop_exact mangle POSTROUTING -p tcp -m tcp --sport "$sport" --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1360
  done

  # До DNAT: сервер видит MSS 1360 и не шлёт сегменты больше туннеля.
  ensure_one mangle PREROUTING -p tcp -m multiport --dports 80,443 -m tcp --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1360
  # mangle, не filter: ACCEPT в filter FORWARD у Docker оборвал бы цепочку раньше.
  ensure_one mangle FORWARD -p tcp -m tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu

  if [[ -z "${INVOCATION_ID:-}" ]]; then
    if command -v netfilter-persistent >/dev/null 2>&1; then
      netfilter-persistent save >/dev/null 2>&1 || true
      echo "ok: netfilter-persistent save attempted"
    elif [[ -d /etc/iptables ]] && command -v iptables-save >/dev/null 2>&1; then
      iptables-save >/etc/iptables/rules.v4 2>/dev/null || true
      echo "ok: iptables-save attempted"
    fi

    if command -v systemctl >/dev/null 2>&1; then
      local UNIT=/etc/systemd/system/dvarf-vpn-mtu.service
      cat >"$UNIT" <<'EOF'
[Unit]
Description=Dvarf VPN/MTU TCPMSS clamp for incoming :80 and :443
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/opt/dvarf/deploy/apply-vpn-mtu.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF
      systemctl daemon-reload || echo "WARN: systemctl daemon-reload не выполнен"
      systemctl enable dvarf-vpn-mtu.service >/dev/null 2>&1 || true
      echo "ok: systemd unit dvarf-vpn-mtu enabled"
    else
      echo "WARN: systemctl нет, unit не установлен. Правила этой загрузки уже в iptables."
    fi
  fi

  echo "=== VPN/MTU harden done ==="
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  apply_vpn_mtu
fi
