#!/usr/bin/env bash
# Снимок сети только на чтение. Пишется в журнал выкладки.
# Никогда не валит деплой и не печатает секреты, .env и токены.
set +e
set -u

echo "=== Dvarf diagnose-network (только чтение) ==="
echo "Секреты этот скрипт не печатает."
echo
echo "Панель Timeweb (владелец, 11.11.2026): защита от DDoS выключена, групп правил Firewall нет,"
echo "IPv6 нет, единственный IPv4 201.34.132.252. Панель VPN не режет."
echo "RAM 4 ГБ, занято около 0,8 ГБ — таймаут открытия сайта это не память."
echo
echo "Через тот же Sota (Швеция) timeweb.cloud открывается, а creed20.tech и /health — нет."
echo "VPN не режет российские сайты целиком. Вопрос узкий: доходит ли SYN с 217.217.228.172"
echo "до 201.34.132.252, и нет ли на машине запрета этого адреса или подсети 217.217.228.0/24"
echo "(iptables, nft, ufw, fail2ban, цепочка DOCKER-USER, гео-правила)."
echo "Пустой tcpdump значит: пакет до сетевой карты не дошёл. Файрвол машины режет уже пришедшее"
echo "и в tcpdump такое было бы видно. Если SYN есть, а вердикт ниже без запрета — дальше MTU."

section() {
  echo
  echo "--- $* ---"
}

run() {
  section "$*"
  "$@"
  local code=$?
  if [[ "$code" -ne 0 ]]; then
    echo "(код ${code}, деплой не останавливаем)"
  fi
}

if command -v ufw >/dev/null 2>&1; then
  run ufw status verbose
else
  section "ufw status verbose"
  echo "ufw не установлен"
fi

if command -v fail2ban-client >/dev/null 2>&1; then
  run fail2ban-client status
  jails="$(fail2ban-client status 2>/dev/null | sed -n 's/.*Jail list:[[:space:]]*//p' | tr ',' ' ')"
  for jail in $jails; do
    jail="${jail// /}"
    if [[ -n "$jail" ]]; then
      run fail2ban-client status "$jail"
    fi
  done
else
  section "fail2ban-client status"
  echo "fail2ban-client не установлен"
fi

run iptables -S
run iptables -L -v -n
run iptables -t mangle -S
run iptables -t mangle -L -v -n
run iptables -t raw -S
run iptables -t raw -L -v -n

section "счётчики входящих SYN (mangle PREROUTING, dport 80/443)"
if iptables -t mangle -L PREROUTING -v -n -x 2>/dev/null | grep -E 'dports 80,443|dpt:(80|443)|TCPMSS'; then
  echo "pkts растёт, только если SYN дошёл до этой машины."
  echo "После попытки с Sota число не изменилось — пакет с 217.217.228.172 до карты не дошёл."
  echo "Число выросло — пакет дошёл. Смотрите, нет ли этой подсети в запрете ниже."
else
  echo "правила TCPMSS в mangle PREROUTING нет или iptables недоступен"
fi

section "правила, похожие на дроп, гео или DDoS (iptables-save и nft)"
echo "Сырой список. Изоляция Docker (DROP на адрес подсети моста с «! -i br-*» или docker0) в вердикт не входит."
hits="$(
  {
    iptables-save 2>/dev/null
    if command -v nft >/dev/null 2>&1; then
      nft list ruleset 2>/dev/null
    fi
  } | grep -Ei 'ddos|drop|reject|geoip|xt_geoip|country|timeweb' | head -n 80
)"
if [[ -n "${hits}" ]]; then
  printf '%s\n' "$hits"
else
  echo "(таких строк нет или команды недоступны)"
fi

section "nft list ruleset | head -200"
if command -v nft >/dev/null 2>&1; then
  nft list ruleset 2>&1 | head -n 200
else
  echo "nft не установлен"
fi

run ip link

section "docker exec dvarf-edge sysctl net.ipv4.tcp_mtu_probing net.ipv4.tcp_base_mss"
if command -v docker >/dev/null 2>&1; then
  if ! docker exec dvarf-edge sysctl net.ipv4.tcp_mtu_probing net.ipv4.tcp_base_mss; then
    echo "(не прочитали sysctl в dvarf-edge, деплой не останавливаем)"
  fi
else
  echo "docker не установлен"
fi

section "curl -sS -D - -o /dev/null https://creed20.tech/health"
# HEAD здесь даёт 405: /health принимает только GET. Печатаем заголовки, тело не нужно.
curl -sS -D - -o /dev/null --max-time 15 https://creed20.tech/health || echo "curl не получил заголовки"

section "одна команда владельцу, пока с Sota открывают сайт (скрипт её не запускает)"
cat <<'EOF'
Только чтение, правила не меняет. На сервере:

  tcpdump -n -i any 'tcp port 443 and host 217.217.228.172 and (tcp[tcpflags] & tcp-syn != 0)'

Пока она работает, с телефона через Sota (Швеция) открыть https://creed20.tech/health . Остановить: Ctrl+C.
Пусто — SYN с 217.217.228.172 до сервера не дошёл (ufw/iptables такой пакет всё равно показали бы).
Строка «217.217.228.172 > 201.34.132.252» с [S] — SYN дошёл. Дальше вердикт ниже: бан подсети или MTU.
Если permission denied — в начале той же команды sudo. Это по-прежнему только чтение.
EOF

# Штатная изоляция моста Docker, не бан внешнего клиента:
#   -A PREROUTING -d 172.18.0.2/32 ! -i br-XXXX -j DROP
#   -A PREROUTING -d 172.17.0.0/16 ! -i docker0 -j DROP
# Пакет к адресу контейнера, пришедший не с его моста, отбрасывается.
# Скрипт это только читает и в вердикт не берёт.
is_docker_bridge_isolation() {
  local line="$1"
  printf '%s\n' "$line" | grep -Eq -- '-j DROP([[:space:]]|$)' || return 1
  printf '%s\n' "$line" | grep -Eq -- '! -i (br-[0-9A-Za-z]+|docker0)([[:space:]]|$)' || return 1
  printf '%s\n' "$line" | grep -Eq -- '-d (10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)' || return 1
  return 0
}

print_verdict() {
  section "вердикт: бан на сервере или SYN не дошёл"
  local host_block=0
  local notes=""
  local ufw_text=""
  local input_rules=""
  local policy=""
  local drops=""
  local raw_drops=""
  local forward_rules=""
  local docker_iso=0
  local real_raw=0
  local jails=""
  local jail=""
  local jail_text=""
  local banned=""
  local line=""

  if command -v ufw >/dev/null 2>&1; then
    ufw_text="$(ufw status verbose 2>&1 || true)"
    if printf '%s\n' "$ufw_text" | grep -q 'Status: inactive'; then
      notes="${notes}ufw выключен. "
    elif printf '%s\n' "$ufw_text" | grep -q 'Status: active'; then
      if printf '%s\n' "$ufw_text" | grep -E '80|443' | grep -E 'DENY|REJECT' >/dev/null; then
        host_block=1
        notes="${notes}ufw запрещает 80 или 443. "
      fi
      if printf '%s\n' "$ufw_text" | grep -Eq 'Default: (deny|reject) \(incoming\)'; then
        if ! printf '%s\n' "$ufw_text" | grep -E '80|443' | grep -q ALLOW; then
          host_block=1
          notes="${notes}ufw запрещает входящие по умолчанию, разрешения на 80/443 нет. "
        fi
      fi
      if [[ "$host_block" -eq 0 ]]; then
        notes="${notes}ufw включён, запрета 80/443 в его статусе нет. "
      fi
    else
      notes="${notes}ufw есть, но статус не прочитан. "
    fi
  else
    notes="${notes}ufw не установлен. "
  fi

  if command -v fail2ban-client >/dev/null 2>&1; then
    jails="$(fail2ban-client status 2>/dev/null | sed -n 's/.*Jail list:[[:space:]]*//p' | tr ',' ' ')"
    if [[ -z "${jails// /}" ]]; then
      notes="${notes}fail2ban без jail'ов. "
    fi
    for jail in $jails; do
      jail="${jail// /}"
      [[ -n "$jail" ]] || continue
      jail_text="$(fail2ban-client status "$jail" 2>/dev/null || true)"
      banned="$(printf '%s\n' "$jail_text" | sed -n 's/.*Currently banned:[[:space:]]*//p' | head -n 1)"
      if [[ ! "$banned" =~ ^[0-9]+$ || "$banned" -eq 0 ]]; then
        continue
      fi
      if printf '%s\n' "$jail_text" | grep -q '217.217.228.172'; then
        host_block=1
        notes="${notes}fail2ban ${jail}: в бане 217.217.228.172 (выход Sota). Это блок на сервере. "
      elif [[ "$jail" != "sshd" && "$jail" != "ssh" ]]; then
        host_block=1
        notes="${notes}fail2ban ${jail}: забанено ${banned} (не ssh). "
      else
        notes="${notes}fail2ban ${jail}: забанено ${banned}, это ssh и на :443 не влияет. "
      fi
    done
  else
    notes="${notes}fail2ban не установлен. "
  fi

  input_rules="$(iptables -S INPUT 2>/dev/null || true)"
  if [[ -z "$input_rules" ]]; then
    notes="${notes}iptables INPUT не прочитан. "
  else
    policy="$(printf '%s\n' "$input_rules" | awk '/^-P INPUT / { print $3; exit }')"
    notes="${notes}Политика INPUT: ${policy:-неизвестна}. "
    if [[ "$policy" == "DROP" || "$policy" == "REJECT" ]]; then
      host_block=1
      notes="${notes}Политика INPUT дропает входящие. "
    fi
    drops="$(printf '%s\n' "$input_rules" | grep -E 'DROP|REJECT' || true)"
    if [[ -n "$drops" ]]; then
      while IFS= read -r line; do
        [[ -n "$line" ]] || continue
        [[ "$line" == -P\ * ]] && continue
        if is_docker_bridge_isolation "$line"; then
          continue
        fi
        if printf '%s\n' "$line" | grep -Eq 'dpt:22([^0-9]|$)|dpt:5432([^0-9]|$)'; then
          continue
        fi
        host_block=1
        notes="${notes}INPUT дропает: ${line}. "
      done <<< "$drops"
    fi
  fi

  # Политика FORWARD DROP у Docker — норма. Правило DROP/REJECT в самой
  # цепочке FORWARD на внешний адрес — запрет. Цепочку DOCKER не читаем:
  # её «! -i br-* -o br-* -j DROP» — изоляция моста, не бан клиента.
  forward_rules="$(iptables -S FORWARD 2>/dev/null || true)"
  if [[ -n "$forward_rules" ]]; then
    while IFS= read -r line; do
      [[ "$line" == -A\ * ]] || continue
      printf '%s\n' "$line" | grep -Eq 'DROP|REJECT' || continue
      if is_docker_bridge_isolation "$line"; then
        continue
      fi
      host_block=1
      notes="${notes}FORWARD дропает: ${line}. "
    done <<< "$forward_rules"
  fi

  raw_drops="$(iptables -t raw -S PREROUTING 2>/dev/null | grep -E 'DROP|REJECT' || true)"
  docker_iso=0
  real_raw=0
  if [[ -n "$raw_drops" ]]; then
    while IFS= read -r line; do
      [[ -n "$line" ]] || continue
      [[ "$line" == -P\ * ]] && continue
      if is_docker_bridge_isolation "$line"; then
        docker_iso=$((docker_iso + 1))
        continue
      fi
      real_raw=$((real_raw + 1))
      notes="${notes}raw PREROUTING дропает: ${line}. "
    done <<< "$raw_drops"
  fi
  if (( real_raw > 0 )); then
    host_block=1
  elif (( docker_iso > 0 )); then
    notes="${notes}raw PREROUTING: ${docker_iso} правил изоляции Docker (DROP на адрес моста, не с br-*/docker0) — не запрет. "
  fi

  local docker_user=""
  local docker_drop=""
  docker_user="$(iptables -S DOCKER-USER 2>&1 || true)"
  if [[ -z "$docker_user" ]]; then
    notes="${notes}DOCKER-USER не прочитан. "
  elif printf '%s\n' "$docker_user" | grep -qi 'No chain\|does not exist'; then
    notes="${notes}Цепочки DOCKER-USER нет. "
  elif printf '%s\n' "$docker_user" | grep -qi 'Permission denied\|Operation not permitted'; then
    notes="${notes}DOCKER-USER не прочитан (нет прав). "
  else
    docker_drop="$(printf '%s\n' "$docker_user" | grep -E 'DROP|REJECT' || true)"
    if [[ -n "$docker_drop" ]]; then
      host_block=1
      notes="${notes}DOCKER-USER дропает трафик в контейнеры: ${docker_drop}. "
    else
      notes="${notes}DOCKER-USER без DROP/REJECT. "
    fi
  fi

  local rules_blob=""
  local sota_lines=""
  local geo_lines=""
  local sota_line=""
  rules_blob="$(
    iptables-save 2>/dev/null || true
    printf '%s\n' "$docker_user"
    if command -v nft >/dev/null 2>&1; then
      nft list ruleset 2>/dev/null | grep -Ei '217\.217\.228\.|geoip|xt_geoip|DOCKER-USER' || true
    fi
    if command -v ufw >/dev/null 2>&1; then
      ufw status verbose 2>/dev/null || true
    fi
    if command -v ipset >/dev/null 2>&1; then
      ipset list 2>/dev/null | grep -F '217.217.228.' || true
    fi
    if command -v fail2ban-client >/dev/null 2>&1; then
      jails="$(fail2ban-client status 2>/dev/null | sed -n 's/.*Jail list:[[:space:]]*//p' | tr ',' ' ')"
      for jail in $jails; do
        jail="${jail// /}"
        [[ -n "$jail" ]] || continue
        fail2ban-client status "$jail" 2>/dev/null || true
      done
    fi
  )"
  echo
  echo "Поиск 217.217.228.0/24 (адрес Sota 217.217.228.172) в правилах, ipset и банах:"
  sota_lines="$(printf '%s\n' "$rules_blob" | grep -F '217.217.228.' || true)"
  if [[ -z "$sota_lines" ]]; then
    echo "совпадений нет: ни адреса, ни подсети в правилах и банах."
    notes="${notes}217.217.228.0/24 в правилах и банах нет. "
  else
    printf '%s\n' "$sota_lines"
    while IFS= read -r sota_line; do
      [[ -n "$sota_line" ]] || continue
      if printf '%s\n' "$sota_line" | grep -Eiq 'DROP|REJECT|Banned IP'; then
        host_block=1
        notes="${notes}Подсеть или адрес Sota в запрете: ${sota_line}. "
      fi
    done <<< "$sota_lines"
  fi
  geo_lines="$(printf '%s\n' "$rules_blob" | grep -Ei 'geoip|xt_geoip|geoip2' || true)"
  echo
  echo "Гео-правила:"
  if [[ -z "$geo_lines" ]]; then
    echo "нет (geoip/xt_geoip в правилах не встретились)."
    notes="${notes}Гео-правил нет. "
  else
    printf '%s\n' "$geo_lines"
    if printf '%s\n' "$geo_lines" | grep -Eq 'DROP|REJECT'; then
      host_block=1
      notes="${notes}Гео-правило дропает трафик. "
    else
      notes="${notes}Гео-строки есть, DROP/REJECT в них нет. "
    fi
  fi

  # Политика FORWARD DROP у Docker — норма, в вердикт её не берём.
  echo
  if [[ "$host_block" -eq 0 ]]; then
    echo "ВЕРДИКТ: на этой машине запрета 443 и подсети 217.217.228.0/24 не видно."
    echo "$notes"
    echo "timeweb.cloud через тот же Sota открывается, так что это не запрет всех российских сайтов."
    echo "Дальше одна команда tcpdump выше: пусто — SYN до сервера не дошёл; строка с [S] — дошёл, и раз запрета нет, дальше MTU."
  else
    echo "ВЕРДИКТ: на этой машине есть запрет. Это блок на сервере, не панель Timeweb."
    echo "$notes"
    echo "Если tcpdump показывает SYN с 217.217.228.172 — пакет дошёл и срабатывает запрет выше."
    echo "Если tcpdump пустой — этот SYN до карты не дошёл. Запрет на машине его ещё не видел."
  fi
}

print_verdict

echo
echo "=== diagnose-network done ==="
exit 0
