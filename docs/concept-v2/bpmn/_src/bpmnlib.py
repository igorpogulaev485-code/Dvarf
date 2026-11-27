# -*- coding: utf-8 -*-
"""Minimal BPMN 2.0 XML + DI writer for collaboration diagrams."""
from __future__ import annotations

import html
from dataclasses import dataclass, field


def esc(text: str) -> str:
    return html.escape(text or "", quote=True)


@dataclass
class Node:
    nid: str
    typ: str
    name: str
    process: str
    x: float
    y: float
    w: float
    h: float


@dataclass
class Flow:
    fid: str
    source: str
    target: str
    name: str = ""
    kind: str = "sequence"
    waypoints: list[tuple[float, float]] | None = None


@dataclass
class Pool:
    pid: str
    name: str
    process: str
    x: float
    y: float
    w: float
    h: float
    lanes: list[tuple[str, str, float, float, float, float]] = field(default_factory=list)


class Diagram:
    def __init__(self, def_id: str, name: str):
        self.def_id = def_id
        self.name = name
        self.pools: list[Pool] = []
        self.nodes: dict[str, Node] = {}
        self.flows: list[Flow] = []
        self.annotations: list[tuple[str, str, str, float, float, float, float]] = []
        self.assoc: list[tuple[str, str, str]] = []

    def pool(self, pid: str, name: str, process: str, x, y, w, h, lanes=None):
        p = Pool(pid, name, process, x, y, w, h, lanes or [])
        self.pools.append(p)
        return p

    def add(self, typ: str, nid: str, name: str, process: str, x, y, w=None, h=None):
        if typ in ("start", "end", "intermediate", "event"):
            w, h = (w or 36), (h or 36)
        elif typ in ("exclusive", "parallel"):
            w, h = (w or 50), (h or 50)
        else:
            w, h = (w or 200), (h or 84)
        n = Node(nid, typ, name, process, x, y, w, h)
        self.nodes[nid] = n
        return n

    def flow(self, fid: str, src: str, tgt: str, name: str = "", kind: str = "sequence", waypoints=None):
        self.flows.append(Flow(fid, src, tgt, name, kind, waypoints))

    def note(self, nid: str, process: str, text: str, x, y, w, h, attach=None):
        self.annotations.append((nid, process, text, x, y, w, h))
        if attach:
            self.assoc.append((nid + "_assoc", nid, attach))

    def _node_boxes(self, exclude: set[str]):
        return [(n.x, n.y, n.w, n.h) for nid, n in self.nodes.items() if nid not in exclude]

    def _seg_hits(self, x1, y1, x2, y2, boxes, pad=6) -> bool:
        # axis-aligned segment vs boxes
        lo_x, hi_x = (x1, x2) if x1 <= x2 else (x2, x1)
        lo_y, hi_y = (y1, y2) if y1 <= y2 else (y2, y1)
        for bx, by, bw, bh in boxes:
            if hi_x < bx - pad or lo_x > bx + bw + pad:
                continue
            if hi_y < by - pad or lo_y > by + bh + pad:
                continue
            return True
        return False

    def _clear_x(self, candidates, y1, y2, boxes):
        seen = set()
        for x in candidates:
            x = round(x, 1)
            if x in seen:
                continue
            seen.add(x)
            if not self._seg_hits(x, y1, x, y2, boxes):
                return x
        return candidates[0]

    def _channel_candidates(self, a, b):
        xs = [a.x + a.w / 2, b.x + b.w / 2, a.x + a.w + 28, a.x - 28, b.x + b.w + 28, b.x - 28]
        edges = sorted({n.x for n in self.nodes.values()} | {n.x + n.w for n in self.nodes.values()})
        for i in range(len(edges) - 1):
            if edges[i + 1] - edges[i] >= 36:
                xs.append((edges[i] + edges[i + 1]) / 2)
        return xs

    def _gutters_between(self, y1, y2):
        lo, hi = (y1, y2) if y1 <= y2 else (y2, y1)
        pools = sorted(self.pools, key=lambda p: p.y)
        out = []
        for i in range(len(pools) - 1):
            g0 = pools[i].y + pools[i].h
            g1 = pools[i + 1].y
            mid = (g0 + g1) / 2
            if g1 - g0 >= 16 and lo < mid < hi:
                out.append(mid)
        return out if y1 <= y2 else list(reversed(out))

    def _message_waypoints(self, fl: Flow) -> list[tuple[float, float]]:
        a = self.nodes[fl.source]
        b = self.nodes[fl.target]
        boxes = self._node_boxes({fl.source, fl.target})
        going_down = (a.y + a.h / 2) < (b.y + b.h / 2)
        ay = a.y + a.h if going_down else a.y
        by = b.y if going_down else b.y + b.h
        acx, bcx = a.x + a.w / 2, b.x + b.w / 2
        gutters = self._gutters_between(ay, by)
        cands = self._channel_candidates(a, b)
        # y-stops: start, gutters, end
        stops = [ay, *gutters, by]
        # choose a channel x that is clear across the whole span if possible
        channel = self._clear_x(cands, ay, by, boxes)
        pts = [(acx, ay)]
        # If we must cross other pools, travel vertically in the channel, horizontally only in gutters
        if gutters:
            # to first gutter at source x if clear, else immediately to channel
            g0 = gutters[0]
            if self._seg_hits(acx, ay, acx, g0, boxes):
                pts += [(channel, ay), (channel, g0)]
            else:
                pts += [(acx, g0)]
                if abs(acx - channel) > 2:
                    pts += [(channel, g0)]
            # remaining gutters and end along the channel, then to target x in last gutter
            last_g = gutters[-1]
            if last_g != g0:
                pts += [(channel, last_g)]
            if abs(channel - bcx) > 2:
                pts += [(bcx, last_g)]
            pts += [(bcx, by)]
        else:
            if abs(acx - bcx) < 3 and not self._seg_hits(acx, ay, acx, by, boxes):
                return [(acx, ay), (bcx, by)]
            midy = (ay + by) / 2
            pts = [(acx, ay), (channel, ay), (channel, midy), (bcx, midy), (bcx, by)]
        # dedup consecutive
        clean = [pts[0]]
        for x, y in pts[1:]:
            px, py_ = clean[-1]
            if abs(x - px) < 0.6 and abs(y - py_) < 0.6:
                continue
            clean.append((x, y))
        return clean

    def _default_waypoints(self, fl: Flow) -> list[tuple[float, float]]:
        a = self.nodes[fl.source]
        b = self.nodes[fl.target]
        acx, acy = a.x + a.w / 2, a.y + a.h / 2
        bcx, bcy = b.x + b.w / 2, b.y + b.h / 2
        if fl.kind == "message":
            return self._message_waypoints(fl)
        same_row = abs(acy - bcy) < 14
        same_col = abs(acx - bcx) < 14
        if same_row:
            if b.x >= a.x + a.w:
                return [(a.x + a.w, acy), (b.x, bcy)]
            if a.x >= b.x + b.w:
                return [(a.x, acy), (b.x + b.w, bcy)]
        if same_col:
            if b.y >= a.y + a.h:
                return [(acx, a.y + a.h), (bcx, b.y)]
            if a.y >= b.y + b.h:
                return [(acx, a.y), (bcx, b.y + b.h)]
        if b.x >= a.x + a.w - 8:
            x1, y1 = a.x + a.w, acy
            x2, y2 = b.x, bcy
            mid = (x1 + x2) / 2
            return [(x1, y1), (mid, y1), (mid, y2), (x2, y2)]
        if a.x >= b.x + b.w - 8:
            x1, y1 = a.x, acy
            x2, y2 = b.x + b.w, bcy
            mid = (x1 + x2) / 2
            return [(x1, y1), (mid, y1), (mid, y2), (x2, y2)]
        if b.y > a.y:
            midy = (a.y + a.h + b.y) / 2
            return [(acx, a.y + a.h), (acx, midy), (bcx, midy), (bcx, b.y)]
        midy = (b.y + b.h + a.y) / 2
        return [(acx, a.y), (acx, midy), (bcx, midy), (bcx, b.y + b.h)]

    def to_xml(self) -> str:
        typemap = {
            "start": "startEvent",
            "end": "endEvent",
            "intermediate": "intermediateCatchEvent",
            "event": "intermediateThrowEvent",
            "user": "userTask",
            "service": "serviceTask",
            "send": "sendTask",
            "receive": "receiveTask",
            "script": "scriptTask",
            "manual": "manualTask",
            "call": "callActivity",
            "subprocess": "subProcess",
            "exclusive": "exclusiveGateway",
            "parallel": "parallelGateway",
        }
        nodes_by: dict[str, list[Node]] = {p.process: [] for p in self.pools}
        for n in self.nodes.values():
            nodes_by.setdefault(n.process, []).append(n)

        seq_by: dict[str, list[Flow]] = {p.process: [] for p in self.pools}
        incoming: dict[str, list[str]] = {}
        outgoing: dict[str, list[str]] = {}
        for fl in self.flows:
            if fl.kind != "sequence":
                continue
            src = self.nodes[fl.source]
            seq_by.setdefault(src.process, []).append(fl)
            outgoing.setdefault(fl.source, []).append(fl.fid)
            incoming.setdefault(fl.target, []).append(fl.fid)

        out: list[str] = []
        out.append('<?xml version="1.0" encoding="UTF-8"?>')
        out.append(
            '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" '
            'xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" '
            'xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" '
            'xmlns:di="http://www.omg.org/spec/DD/20100524/DI" '
            f'id="Definitions_{esc(self.def_id)}" name="{esc(self.name)}" '
            'targetNamespace="https://creed20.tech/bpmn" '
            'exporter="КриD20 BPMN maps" exporterVersion="1.0">'
        )
        out.append(f'  <bpmn:collaboration id="Collab_{esc(self.def_id)}">')
        for p in self.pools:
            out.append(
                f'    <bpmn:participant id="{esc(p.pid)}" name="{esc(p.name)}" processRef="{esc(p.process)}" />'
            )
        for fl in self.flows:
            if fl.kind == "message":
                out.append(
                    f'    <bpmn:messageFlow id="{esc(fl.fid)}" name="{esc(fl.name)}" '
                    f'sourceRef="{esc(fl.source)}" targetRef="{esc(fl.target)}" />'
                )
        out.append("  </bpmn:collaboration>")

        for p in self.pools:
            out.append(
                f'  <bpmn:process id="{esc(p.process)}" name="{esc(p.name)}" isExecutable="false">'
            )
            if p.lanes:
                out.append(f'    <bpmn:laneSet id="LaneSet_{esc(p.process)}">')
                for lid, lname, lx, ly, lw, lh in p.lanes:
                    out.append(f'      <bpmn:lane id="{esc(lid)}" name="{esc(lname)}">')
                    for n in nodes_by.get(p.process, []):
                        cy = n.y + n.h / 2
                        if ly - 1 <= cy <= ly + lh + 1:
                            out.append(f'        <bpmn:flowNodeRef>{esc(n.nid)}</bpmn:flowNodeRef>')
                    out.append("      </bpmn:lane>")
                out.append("    </bpmn:laneSet>")
            for n in nodes_by.get(p.process, []):
                tag = typemap[n.typ]
                extra = ' gatewayDirection="Unspecified"' if n.typ == "exclusive" else ""
                if n.typ == "subprocess":
                    extra = ' triggeredByEvent="false"'
                out.append(f'    <bpmn:{tag} id="{esc(n.nid)}" name="{esc(n.name)}"{extra}>')
                for fid in incoming.get(n.nid, []):
                    out.append(f'      <bpmn:incoming>{esc(fid)}</bpmn:incoming>')
                for fid in outgoing.get(n.nid, []):
                    out.append(f'      <bpmn:outgoing>{esc(fid)}</bpmn:outgoing>')
                out.append(f'    </bpmn:{tag}>')
            for nid, proc, text, *_rest in self.annotations:
                if proc != p.process:
                    continue
                out.append(
                    f'    <bpmn:textAnnotation id="{esc(nid)}">'
                    f'<bpmn:text>{esc(text)}</bpmn:text></bpmn:textAnnotation>'
                )
            for aid, src, tgt in self.assoc:
                if any(a[0] == src and a[1] == p.process for a in self.annotations):
                    out.append(
                        f'    <bpmn:association id="{esc(aid)}" sourceRef="{esc(src)}" '
                        f'targetRef="{esc(tgt)}" associationDirection="None" />'
                    )
            for fl in seq_by.get(p.process, []):
                out.append(
                    f'    <bpmn:sequenceFlow id="{esc(fl.fid)}" name="{esc(fl.name)}" '
                    f'sourceRef="{esc(fl.source)}" targetRef="{esc(fl.target)}" />'
                )
            out.append("  </bpmn:process>")

        out.append(f'  <bpmndi:BPMNDiagram id="Diagram_{esc(self.def_id)}">')
        out.append(
            f'    <bpmndi:BPMNPlane id="Plane_{esc(self.def_id)}" bpmnElement="Collab_{esc(self.def_id)}">'
        )
        for p in self.pools:
            out.append(
                f'      <bpmndi:BPMNShape id="{esc(p.pid)}_di" bpmnElement="{esc(p.pid)}" isHorizontal="true">'
            )
            out.append(f'        <dc:Bounds x="{p.x}" y="{p.y}" width="{p.w}" height="{p.h}" />')
            out.append("      </bpmndi:BPMNShape>")
            for lid, lname, lx, ly, lw, lh in p.lanes:
                out.append(
                    f'      <bpmndi:BPMNShape id="{esc(lid)}_di" bpmnElement="{esc(lid)}" isHorizontal="true">'
                )
                out.append(f'        <dc:Bounds x="{lx}" y="{ly}" width="{lw}" height="{lh}" />')
                out.append("      </bpmndi:BPMNShape>")
        for n in self.nodes.values():
            marker = ' isMarkerVisible="true"' if n.typ == "exclusive" else ""
            out.append(f'      <bpmndi:BPMNShape id="{esc(n.nid)}_di" bpmnElement="{esc(n.nid)}"{marker}>')
            out.append(f'        <dc:Bounds x="{n.x}" y="{n.y}" width="{n.w}" height="{n.h}" />')
            out.append("      </bpmndi:BPMNShape>")
        for nid, proc, text, x, y, w, h in self.annotations:
            out.append(f'      <bpmndi:BPMNShape id="{esc(nid)}_di" bpmnElement="{esc(nid)}">')
            out.append(f'        <dc:Bounds x="{x}" y="{y}" width="{w}" height="{h}" />')
            out.append("      </bpmndi:BPMNShape>")
        for aid, src, tgt in self.assoc:
            ann = next(a for a in self.annotations if a[0] == src)
            _, _, _, ax, ay, aw, ah = ann
            n = self.nodes[tgt]
            out.append(f'      <bpmndi:BPMNEdge id="{esc(aid)}_di" bpmnElement="{esc(aid)}">')
            out.append(f'        <di:waypoint x="{ax + aw}" y="{ay + ah / 2}" />')
            out.append(f'        <di:waypoint x="{n.x}" y="{n.y + n.h / 2}" />')
            out.append("      </bpmndi:BPMNEdge>")
        for fl in self.flows:
            wps = fl.waypoints or self._default_waypoints(fl)
            out.append(f'      <bpmndi:BPMNEdge id="{esc(fl.fid)}_di" bpmnElement="{esc(fl.fid)}">')
            for x, y in wps:
                out.append(f'        <di:waypoint x="{round(x, 1)}" y="{round(y, 1)}" />')
            out.append("      </bpmndi:BPMNEdge>")
        out.append("    </bpmndi:BPMNPlane>")
        out.append("  </bpmndi:BPMNDiagram>")
        out.append("</bpmn:definitions>")
        return "\n".join(out) + "\n"
