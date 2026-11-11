#!/usr/bin/env bash
# TCP до VPS через мобильный VPN с дырявым PMTUD.
# Не фильтрует выходные IP VPN: только MSS и tcp_mtu_probing.
#
# Крупные пакеты идут от сервера (цепочка сертификатов, JS). Их размер задаёт
# MSS из входящего SYN клиента. Старые правила OUTPUT/POSTROUTING --sport
# урезали только пакеты клиента и здесь снимаются.
# Входящий SYN клампится в mangle PREROUTING до DNAT Docker.
# Контейнер edge (Caddy) имеет свой netns: tcp_mtu_probing ему ставит compose.
set -euo pipefail

echo "=== Dvarf VPN/MTU harden ==="

SYSCTL_FILE=/etc/sysctl.d/99-dvarf-vpn-mtu.conf
cat >"$SYSCTL_FILE" <<'EOF'
# Mobile VPN tunnels often shrink MTU and drop ICMP "Fragmentation Needed".
# Without probing, large TCP segments blackhole → Safari white screen / stuck bar.
net.ipv4.tcp_mtu_probing = 1
EOF
sysctl -p "$SYSCTL_FILE" >/dev/null
sysctl net.ipv4.tcp_mtu_probing

# -C совпадает с правилом, -D снимает одну копию. Нет правила — не ошибка.
drop_rule() {
  local table="$1"
  local chain="$2"
  shift 2
  local n=0
  while iptables -t "$table" -C "$chain" "$@" 2>/dev/null; do
    iptables -t "$table" -D "$chain" "$@"
    n=$((n + 1))
    if (( n >= 20 )); then
      echo "WARN: в $table/$chain слишком много копий, удаление остановлено"
      break
    fi
  done
  if (( n > 0 )); then
    echo "ok: снято ${n} правил mangle ${chain}"
  else
    echo "ok: старых правил mangle ${chain} нет"
  fi
}

ensure_rule() {
  local table="$1"
  local chain="$2"
  shift 2
  if iptables -t "$table" -C "$chain" "$@" 2>/dev/null; then
    echo "ok: mangle ${chain} уже есть"
  else
    iptables -t "$table" -A "$chain" "$@"
    echo "ok: mangle ${chain} добавлено"
  fi
}

for sport in 80 443; do
  drop_rule mangle OUTPUT -p tcp --sport "$sport" -m tcp --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1360
  drop_rule mangle POSTROUTING -p tcp --sport "$sport" -m tcp --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1360
done

# До DNAT: сервер видит MSS 1360 и не шлёт сегменты больше туннеля.
ensure_rule mangle PREROUTING -p tcp -m multiport --dports 80,443 --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1360
# mangle, не filter: ACCEPT в filter FORWARD у Docker оборвал бы цепочку раньше.
ensure_rule mangle FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu

if [[ -z "${INVOCATION_ID:-}" ]]; then
  if command -v netfilter-persistent >/dev/null 2>&1; then
    netfilter-persistent save >/dev/null 2>&1 || true
    echo "ok: netfilter-persistent save attempted"
  elif [[ -d /etc/iptables ]] && command -v iptables-save >/dev/null 2>&1; then
    iptables-save >/etc/iptables/rules.v4 2>/dev/null || true
    echo "ok: iptables-save attempted"
  fi

  if command -v systemctl >/dev/null 2>&1; then
    UNIT=/etc/systemd/system/dvarf-vpn-mtu.service
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
