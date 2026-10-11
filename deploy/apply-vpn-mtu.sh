#!/usr/bin/env bash
# Make HTTP to the VPS survive mobile VPN paths with broken PMTUD / low MTU.
# Does NOT block or filter VPN exits — only clamps TCP MSS and enables MTU probing.
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

# Clamp MSS on SYN/ACK from :80 so the client's path MTU is respected even when
# ICMP is filtered inside the VPN. 1360 fits typical WG/OpenVPN overhead on 1500.
ensure_mss_rule() {
  local chain="$1"
  local spec=( -p tcp --sport 80 -m tcp --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1360 )
  if iptables -t mangle -C "$chain" "${spec[@]}" 2>/dev/null; then
    echo "ok: mangle $chain TCPMSS 1360 already present"
  else
    iptables -t mangle -A "$chain" "${spec[@]}"
    echo "ok: mangle $chain TCPMSS 1360 added"
  fi
}

ensure_mss_rule OUTPUT
ensure_mss_rule POSTROUTING

# Persist across reboot. When invoked by systemd (INVOCATION_ID set), skip unit install.
if [[ -z "${INVOCATION_ID:-}" ]]; then
  if command -v netfilter-persistent >/dev/null 2>&1; then
    netfilter-persistent save >/dev/null 2>&1 || true
    echo "ok: netfilter-persistent save attempted"
  elif [[ -d /etc/iptables ]] && command -v iptables-save >/dev/null 2>&1; then
    iptables-save >/etc/iptables/rules.v4 2>/dev/null || true
    echo "ok: iptables-save attempted"
  fi

  UNIT=/etc/systemd/system/dvarf-vpn-mtu.service
  cat >"$UNIT" <<'EOF'
[Unit]
Description=Dvarf VPN/MTU TCPMSS clamp for :80
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/opt/dvarf/deploy/apply-vpn-mtu.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable dvarf-vpn-mtu.service >/dev/null 2>&1 || true
  echo "ok: systemd unit dvarf-vpn-mtu enabled"
fi

echo "=== VPN/MTU harden done ==="
