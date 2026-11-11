#!/usr/bin/env bash
# Make TCP to the VPS survive mobile VPN paths with broken PMTUD / low MTU.
# Does NOT block or filter VPN exits — only clamps TCP MSS and enables MTU probing.
#
# Why: phone Safari over VPN often stuck on white screen / endless spinner when
# the tunnel shrinks MTU and drops ICMP "Fragmentation Needed". Large JS bundles
# then blackhole. HTTPS on creed20.tech helps, but the same clamp is still needed
# on :443 for bad VPN paths.
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

# Clamp MSS on SYN/ACK so the client's path MTU is respected even when ICMP is
# filtered inside the VPN. 1360 fits typical WG/OpenVPN overhead on 1500.
ensure_mss_rule() {
  local chain="$1"
  local sport="$2"
  local spec=( -p tcp --sport "$sport" -m tcp --tcp-flags SYN,RST SYN -j TCPMSS --set-mss 1360 )
  if iptables -t mangle -C "$chain" "${spec[@]}" 2>/dev/null; then
    echo "ok: mangle $chain TCPMSS 1360 sport $sport already present"
  else
    iptables -t mangle -A "$chain" "${spec[@]}"
    echo "ok: mangle $chain TCPMSS 1360 sport $sport added"
  fi
}

for sport in 80 443; do
  ensure_mss_rule OUTPUT "$sport"
  ensure_mss_rule POSTROUTING "$sport"
done

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
Description=Dvarf VPN/MTU TCPMSS clamp for :80 and :443
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
