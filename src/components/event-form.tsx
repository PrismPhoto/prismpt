import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EVENT_STATUSES, EVENT_TYPES, EUR, packageLabelWithPrice, sortPackages } from "@/lib/format";
import { EXTRA_TYPES, EXTRA_DEFAULT_PRICE, type ExtraType } from "@/lib/extras";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { computeSlotFee, defaultDistribution, slotLabel, extrasForPhotographer, type SlotDistribution } from "@/lib/fee-distribution";

const EMPTY_EXTRAS: any[] = [];

export function EventForm({ event, packages, wps, photographers, onSaved, onSummaryChange, saveRef }: any) {
  const isEdit = !!event;
  const [form, setForm] = useState<any>(() => {
    const existingPhotogs = event?.event_photographers ?? [];
    return {
      event_date: event?.event_date ?? "",
      client_name: event?.client_name ?? "",
      email: event?.email ?? "",
      pax: event?.pax ?? "",
      location: event?.location ?? "",
      event_type: event?.event_type ?? "Casamento",
      package_id: event?.package_id ?? "",
      total_value: event?.total_value ?? 0,
      wedding_planner_id: event?.wedding_planner_id ?? "",
      wp_commission_value: event?.wp_commission_value ?? 0,
      has_pens_caixa: event?.has_pens_caixa ?? false,
      // pre-wedding
      couple_names: event?.couple_names ?? "",
      bride_phone: event?.bride_phone ?? "",
      groom_phone: event?.groom_phone ?? "",
      bride_prep_address: event?.bride_prep_address ?? "",
      groom_prep_address: event?.groom_prep_address ?? "",
      ceremony_location: event?.ceremony_location ?? "",
      ceremony_time: event?.ceremony_time ?? "",
      reception_location: event?.reception_location ?? "",
      instagram_tags: event?.instagram_tags ?? "",
      decoration_company: event?.decoration_company ?? "",
      catering_company: event?.catering_company ?? "",
      videographer: event?.videographer ?? "",
      bride_dress: event?.bride_dress ?? "",
      makeup_hair: event?.makeup_hair ?? "",
      pre_wedding_notes: event?.pre_wedding_notes ?? "",
      photo_permission: event?.photo_permission ?? "",
      // pagamentos
      deposit_amount: event?.deposit_amount ?? 400,
      deposit_method: event?.deposit_method ?? "",
      deposit_paid_date: event?.deposit_paid_date ?? "",
      final_payment_value: event?.final_payment_value ?? "",
      final_payment_date: event?.final_payment_date ?? "",
      final_payment_method: event?.final_payment_method ?? "",
      internal_notes: event?.internal_notes ?? "",
      event_notes: event?.event_notes ?? "",
      status: event?.status ?? "Aguarda Sinal",
      slots: (() => {
        const pkg = packages.find((p: any) => p.id === (event?.package_id ?? ""));
        const dist: SlotDistribution[] = (pkg?.fee_distribution as SlotDistribution[] | null)
          ?? defaultDistribution(
            Math.max(existingPhotogs.length || 1, pkg?.num_prism_photographers ?? 1),
            Boolean(pkg?.has_external_photographer || pkg?.has_external),
          );
        const n = Math.max(dist.length, existingPhotogs.length);
        return Array.from({ length: n }, (_, i) => {
          const ep = existingPhotogs.find((p: any) => p.position === i + 1);
          const slotDist = dist[i];
          const isExt = slotDist?.mode === "fixed";
          return {
            photographer_id: ep?.photographer_id ?? "",
            external_name: ep?.external_name ?? "",
            fee: ep?.fee ?? (isExt ? Number(slotDist?.value ?? 0) : 0),
            prism_commission: ep?.prism_commission ?? 0,
            deposit_amount: ep?.deposit_amount ?? 0,
            deposit_paid: ep?.deposit_paid ?? false,
            deposit_paid_date: ep?.deposit_paid_date ?? "",
            final_payment_received: ep?.final_payment_received ?? false,
            final_payment_value: ep?.final_payment_value ?? 0,
            final_payment_date: ep?.final_payment_date ?? "",
            final_payment_method: ep?.final_payment_method ?? "",
          };
        });
      })(),
    };
  });

  const { data: existingExtrasData } = useQuery({
    queryKey: ["event_extras", event?.id],
    queryFn: async () => event?.id ? ((await supabase.from("event_extras").select("*").eq("event_id", event.id)).data ?? []) : [],
    enabled: !!event?.id,
  });
  const existingExtras = existingExtrasData ?? EMPTY_EXTRAS;
  const [extras, setExtras] = useState<any[]>([]);
  useEffect(() => {
    setExtras(existingExtras.map((x: any) => ({ ...x })));
    const prevSum = existingExtras.reduce((s: number, x: any) => s + Number(x.quantity || 0) * Number(x.unit_price || 0), 0);
    if (!event) return;
    const baseTotal = Number(event.total_value || 0) - prevSum;
    setForm((f: any) => Number(f.total_value || 0) === baseTotal ? f : { ...f, total_value: baseTotal });
  }, [existingExtras, event]);
  const extrasTotal = extras.reduce((s, x) => s + Number(x.quantity || 0) * Number(x.unit_price || 0), 0);

  const selectedPackage = packages.find((p: any) => p.id === form.package_id);
  const distribution: SlotDistribution[] = (selectedPackage?.fee_distribution as SlotDistribution[] | null)
    ?? defaultDistribution(
      Number(selectedPackage?.num_prism_photographers) || form.slots.length || 1,
      Boolean(selectedPackage?.has_external_photographer || selectedPackage?.has_external),
    );
  const fixedOverrides = (slots: any[]) => {
    const o: Record<number, number> = {};
    slots.forEach((s, i) => { if (distribution[i]?.mode === "fixed") o[i] = Number(s.fee || 0); });
    return o;
  };
  const computeFee = (photographer_id: string, idx: number, totalValue: number, prismCommission: number, slots: any[]) => {
    if (!photographer_id) return 0;
    return computeSlotFee(distribution, idx, Number(totalValue || 0), Number(prismCommission || 0), fixedOverrides(slots));
  };
  const isExternalSlot = (idx: number) => distribution[idx]?.mode === "fixed";
  const selectedPhotographerIdsKey = form.slots.map((slot: any) => slot.photographer_id || "").join(",");
  const slotCommissionsKey = form.slots.map((slot: any) => Number(slot.prism_commission || 0)).join(",");
  const externalFeesKey = form.slots.map((slot: any, i: number) => isExternalSlot(i) ? Number(slot.fee || 0) : "").join(",");
  const distributionKey = JSON.stringify(distribution);

  const photographerNames = (form.slots as any[])
    .map((s) => {
      if (s.photographer_id) {
        const p = photographers.find((x: any) => x.id === s.photographer_id);
        return p ? `${p.initials}` : null;
      }
      return s.external_name ? String(s.external_name).trim() : null;
    })
    .filter(Boolean) as string[];
  const photographerNamesKey = photographerNames.join(" · ");
  const packageText = selectedPackage
    ? packageLabelWithPrice(selectedPackage.name, selectedPackage.version, selectedPackage.base_price)
    : "";

  useEffect(() => {
    onSummaryChange?.({
      client_name: form.client_name,
      event_date: form.event_date,
      photographers: photographerNamesKey,
      packageLabel: packageText,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.client_name, form.event_date, photographerNamesKey, packageText]);

  useEffect(() => {
    setForm((f: any) => {
      let changed = false;
      const ov = fixedOverrides(f.slots);
      const nextSlots = (f.slots as any[]).map((s, i) => {
        if (isExternalSlot(i)) return s;
        if (!s.photographer_id) return s;
        const newFee = computeSlotFee(distribution, i, Number(f.total_value || 0), Number(s.prism_commission || 0), ov);
        if (newFee !== Number(s.fee || 0)) {
          changed = true;
          return { ...s, fee: newFee };
        }
        return s;
      });
      return changed ? { ...f, slots: nextSlots } : f;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.total_value, selectedPhotographerIdsKey, slotCommissionsKey, externalFeesKey, distributionKey]);

  useEffect(() => {
    setForm((f: any) => {
      const target = distribution.length;
      if (f.slots.length === target) return f;
      const next = [...f.slots];
      while (next.length < target) {
        const i = next.length;
        const slotDist = distribution[i];
        const isExt = slotDist?.mode === "fixed";
        next.push({
          photographer_id: "", external_name: "",
          fee: isExt ? Number(slotDist?.value ?? 0) : 0,
          prism_commission: 0,
          deposit_amount: 0, deposit_paid: false, deposit_paid_date: "",
          final_payment_received: false, final_payment_value: 0,
          final_payment_date: "", final_payment_method: "",
        });
      }
      while (next.length > target) next.pop();
      return { ...f, slots: next };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distributionKey]);

  const eventTotal = Number(form.total_value || 0) + extrasTotal;
  const suggestedFinalPayment = Math.max(0, eventTotal - Number(form.deposit_amount || 0));

  useEffect(() => {
    setForm((f: any) => {
      const current = f.final_payment_value;
      const isEmpty = current === "" || current === null || current === undefined || Number(current) === 0;
      if (!isEmpty) return f;
      if (Number(current || 0) === suggestedFinalPayment) return f;
      return { ...f, final_payment_value: suggestedFinalPayment };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedFinalPayment]);

  const onPkg = (id: string) => {
    const p = packages.find((x: any) => x.id === id);
    setForm({ ...form, package_id: id, total_value: p?.base_price ?? form.total_value });
  };
  const onWp = (id: string) => {
    const wp = wps.find((x: any) => x.id === id);
    const commission = wp ? Number(form.total_value) * (wp.commission_percentage / 100) : 0;
    setForm({ ...form, wedding_planner_id: id, wp_commission_value: commission });
  };

  const addExtra = () => {
    const t: ExtraType = "Outro";
    setExtras([...extras, { extra_type: t, description: "", quantity: 1, unit_price: EXTRA_DEFAULT_PRICE[t], photographer_id: null }]);
  };
  const updateExtra = (i: number, patch: any) => {
    const next = [...extras];
    next[i] = { ...next[i], ...patch };
    if (patch.extra_type) next[i].unit_price = EXTRA_DEFAULT_PRICE[patch.extra_type as ExtraType] ?? next[i].unit_price;
    setExtras(next);
  };
  const removeExtra = (i: number) => setExtras(extras.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!form.event_date || !form.client_name) return toast.error("Data e cliente obrigatórios");
    const baseTotal = Number(form.total_value || 0);
    const grandTotal = baseTotal + extrasTotal;
    const payload = {
      event_date: form.event_date, client_name: form.client_name, email: form.email || null,
      pax: form.pax ? Number(form.pax) : null, location: form.location || null,
      event_type: form.event_type, package_id: form.package_id || null,
      total_value: grandTotal,
      wedding_planner_id: form.wedding_planner_id || null,
      wp_commission_value: Number(form.wp_commission_value || 0),
      has_pens_caixa: form.has_pens_caixa,
      couple_names: form.couple_names || null,
      bride_phone: form.bride_phone || null,
      groom_phone: form.groom_phone || null,
      bride_prep_address: form.bride_prep_address || null,
      groom_prep_address: form.groom_prep_address || null,
      ceremony_location: form.ceremony_location || null,
      ceremony_time: form.ceremony_time || null,
      reception_location: form.reception_location || null,
      instagram_tags: form.instagram_tags || null,
      decoration_company: form.decoration_company || null,
      catering_company: form.catering_company || null,
      videographer: form.videographer || null,
      bride_dress: form.bride_dress || null,
      makeup_hair: form.makeup_hair || null,
      pre_wedding_notes: form.pre_wedding_notes || null,
      photo_permission: form.photo_permission || null,
      deposit_amount: Number(form.deposit_amount || 0), deposit_method: form.deposit_method || null,
      deposit_paid_date: form.deposit_paid_date || null,
      final_payment_value: form.final_payment_value ? Number(form.final_payment_value) : null,
      final_payment_date: form.final_payment_date || null, final_payment_method: form.final_payment_method || null,
      internal_notes: form.internal_notes || null, event_notes: form.event_notes || null,
      status: form.status,
    };
    let eventId = event?.id;
    if (isEdit) {
      const { error } = await supabase.from("events").update(payload).eq("id", event.id);
      if (error) return toast.error(error.message);
    } else {
      const { data, error } = await supabase.from("events").insert(payload).select().single();
      if (error) return toast.error(error.message);
      eventId = data.id;
    }
    await supabase.from("event_photographers").delete().eq("event_id", eventId);
    const rows = (form.slots as any[])
      .map((s, i) => ({ ...s, position: i + 1, _external: isExternalSlot(i) }))
      .filter((s) => (s._external ? !!(s.external_name && String(s.external_name).trim()) : !!s.photographer_id))
      .map((s) => ({
        event_id: eventId,
        photographer_id: s._external ? null : s.photographer_id,
        external_name: s._external ? String(s.external_name).trim() : null,
        position: s.position,
        fee: s._external
          ? Number(s.fee || 0)
          : computeFee(s.photographer_id, s.position - 1, form.total_value, s.prism_commission, form.slots),
        prism_commission: s._external ? 0 : Number(s.prism_commission || 0),
        deposit_amount: s._external ? 0 : Number(s.deposit_amount || 0),
        deposit_paid: s._external ? false : !!s.deposit_paid,
        deposit_paid_date: s._external ? null : (s.deposit_paid_date || null),
        final_payment_received: !!s.final_payment_received,
        final_payment_value: s._external
          ? (s.final_payment_received ? Number(s.fee || 0) : 0)
          : Number(s.final_payment_value || 0),
        final_payment_date: s.final_payment_date || null,
        final_payment_method: s.final_payment_method || null,
      }));
    if (rows.length) {
      const { error } = await supabase.from("event_photographers").insert(rows);
      if (error) return toast.error(error.message);
    }
    await supabase.from("event_extras").delete().eq("event_id", eventId);
    if (extras.length) {
      const extraRows = extras.map((x) => ({
        event_id: eventId,
        extra_type: x.extra_type,
        description: x.description || null,
        quantity: Number(x.quantity || 0),
        unit_price: Number(x.unit_price || 0),
        total: Number(x.quantity || 0) * Number(x.unit_price || 0),
        photographer_id: x.photographer_id || null,
      }));
      const { error } = await supabase.from("event_extras").insert(extraRows);
      if (error) return toast.error(error.message);
    }
    toast.success("Evento guardado");
    onSaved(eventId);
  };

  if (saveRef) saveRef.current = save;

  const depositDest = String(form.deposit_method || "").startsWith("directo") ? "directo" : "revolut_prism";
  const depositPhotog = String(form.deposit_method || "").startsWith("directo:")
    ? String(form.deposit_method).split(":")[1]
    : "";
  const assignedPhotogs = (form.slots as any[])
    .map((s) => {
      if (s.photographer_id) {
        const p = photographers.find((x: any) => x.id === s.photographer_id);
        return p ? { value: p.initials, label: `${p.initials} · ${p.full_name}` } : null;
      }
      if (s.external_name && String(s.external_name).trim()) {
        const v = String(s.external_name).trim();
        return { value: v, label: `Externo — ${v}` };
      }
      return null;
    })
    .filter(Boolean) as { value: string; label: string }[];

  return (
    <div className="space-y-6">
      <Section title="Informação do evento">
        <div className="grid md:grid-cols-2 gap-3">
          <F label="Data"><Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></F>
          <F label="Status">
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{EVENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </F>
          <F label="Cliente (referência interna)"><Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></F>
          <F label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></F>
          <F label="Pax"><Input type="number" value={form.pax} onChange={(e) => setForm({ ...form, pax: e.target.value })} /></F>
          <F label="Localização geral"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Cidade / região" /></F>
          <F label="Tipo">
            <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </F>
          <F label="Pacote">
            <Select value={form.package_id} onValueChange={onPkg}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{sortPackages(packages as any[]).map((p: any) => <SelectItem key={p.id} value={p.id}>{packageLabelWithPrice(p.name, p.version, p.base_price)}</SelectItem>)}</SelectContent>
            </Select>
          </F>
          <F label="Valor pacote"><Input type="number" step="0.01" value={form.total_value} onChange={(e) => setForm({ ...form, total_value: e.target.value })} /></F>
          <F label="Wedding Planner">
            <Select value={form.wedding_planner_id || "none"} onValueChange={(v) => onWp(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">Nenhum</SelectItem>{wps.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name} ({w.commission_percentage}%)</SelectItem>)}</SelectContent>
            </Select>
          </F>
          {form.wedding_planner_id && (
            <F label="Comissão WP"><Input type="number" step="0.01" value={form.wp_commission_value} onChange={(e) => setForm({ ...form, wp_commission_value: e.target.value })} /></F>
          )}
          <div className="md:col-span-2 flex items-center gap-2 py-1">
            <Checkbox checked={form.has_pens_caixa} onCheckedChange={(c) => setForm({ ...form, has_pens_caixa: !!c })} id="pc" />
            <label htmlFor="pc" className="text-sm">Pens em caixa (+100€)</label>
          </div>
        </div>
      </Section>

      {form.event_type === "Casamento" && (
        <Section title="Detalhes do casamento (pré-wedding)" description="Informação recolhida no formulário que os noivos preenchem.">
          <div className="grid md:grid-cols-2 gap-3">
            <F label="Nomes dos noivos" className="md:col-span-2"><Input value={form.couple_names} onChange={(e) => setForm({ ...form, couple_names: e.target.value })} placeholder="ex.: Ana & João" /></F>
            <F label="Telefone da noiva"><Input value={form.bride_phone} onChange={(e) => setForm({ ...form, bride_phone: e.target.value })} /></F>
            <F label="Telefone do noivo"><Input value={form.groom_phone} onChange={(e) => setForm({ ...form, groom_phone: e.target.value })} /></F>
            <F label="Morada preparação da noiva" className="md:col-span-2"><Textarea rows={2} value={form.bride_prep_address} onChange={(e) => setForm({ ...form, bride_prep_address: e.target.value })} /></F>
            <F label="Morada preparação do noivo" className="md:col-span-2"><Textarea rows={2} value={form.groom_prep_address} onChange={(e) => setForm({ ...form, groom_prep_address: e.target.value })} /></F>
            <F label="Local da cerimónia"><Input value={form.ceremony_location} onChange={(e) => setForm({ ...form, ceremony_location: e.target.value })} placeholder="Igreja ou outro" /></F>
            <F label="Hora da cerimónia"><Input type="time" value={form.ceremony_time} onChange={(e) => setForm({ ...form, ceremony_time: e.target.value })} /></F>
            <F label="Local do copo d'água" className="md:col-span-2"><Input value={form.reception_location} onChange={(e) => setForm({ ...form, reception_location: e.target.value })} /></F>
            <F label="Tags Instagram dos noivos" className="md:col-span-2"><Input value={form.instagram_tags} onChange={(e) => setForm({ ...form, instagram_tags: e.target.value })} placeholder="@noiva @noivo" /></F>
            <F label="Empresa de decoração"><Input value={form.decoration_company} onChange={(e) => setForm({ ...form, decoration_company: e.target.value })} /></F>
            <F label="Empresa de catering"><Input value={form.catering_company} onChange={(e) => setForm({ ...form, catering_company: e.target.value })} /></F>
            <F label="Videógrafo"><Input value={form.videographer} onChange={(e) => setForm({ ...form, videographer: e.target.value })} /></F>
            <F label="Vestido de noiva"><Input value={form.bride_dress} onChange={(e) => setForm({ ...form, bride_dress: e.target.value })} /></F>
            <F label="Makeup & Hair" className="md:col-span-2"><Input value={form.makeup_hair} onChange={(e) => setForm({ ...form, makeup_hair: e.target.value })} /></F>
            <F label="Permissão para usar fotos">
              <Select value={form.photo_permission || "none"} onValueChange={(v) => setForm({ ...form, photo_permission: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="sim">Claro!</SelectItem>
                  <SelectItem value="rever">Sim, mas queremos ver primeiro</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </F>
            <F label="Mais informações / fornecedores" className="md:col-span-2"><Textarea rows={3} value={form.pre_wedding_notes} onChange={(e) => setForm({ ...form, pre_wedding_notes: e.target.value })} /></F>
          </div>
        </Section>
      )}

      <Section title="Pagamentos">
        <div className="grid md:grid-cols-2 gap-3">
          <div className="md:col-span-2 rounded-md border p-3 bg-muted/20 space-y-2">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Sinal</div>
            <div className="grid md:grid-cols-2 gap-3">
              <F label="Sinal (€)"><Input type="number" step="0.01" value={form.deposit_amount} onChange={(e) => setForm({ ...form, deposit_amount: e.target.value })} /></F>
              <F label="Data sinal pago"><Input type="date" value={form.deposit_paid_date} onChange={(e) => setForm({ ...form, deposit_paid_date: e.target.value })} /></F>
              <F label="Destino do sinal">
                <Select
                  value={depositDest}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      deposit_method: v === "revolut_prism" ? "revolut_prism" : `directo:${assignedPhotogs[0]?.value ?? ""}`,
                    })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revolut_prism">Revolut PRISM</SelectItem>
                    <SelectItem value="directo">Directo ao fotógrafo</SelectItem>
                  </SelectContent>
                </Select>
              </F>
              {depositDest === "directo" && (
                <F label="Qual fotógrafo">
                  <Select value={depositPhotog || "none"} onValueChange={(v) => setForm({ ...form, deposit_method: `directo:${v === "none" ? "" : v}` })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {assignedPhotogs.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </F>
              )}
            </div>
          </div>

          <div className="md:col-span-2 rounded-md border p-3 bg-muted/20 space-y-2">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Pagamento final</div>
            <div className="grid md:grid-cols-2 gap-3">
              <F label="Pagamento final (€)">
                <Input type="number" step="0.01" value={form.final_payment_value} onChange={(e) => setForm({ ...form, final_payment_value: e.target.value })} />
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                  <span>Sugerido: {EUR(suggestedFinalPayment)} (valor total {EUR(eventTotal)} − sinal {EUR(Number(form.deposit_amount || 0))})</span>
                  {Number(form.final_payment_value || 0) !== suggestedFinalPayment && (
                    <button type="button" className="text-primary underline" onClick={() => setForm({ ...form, final_payment_value: suggestedFinalPayment })}>usar sugerido</button>
                  )}
                </div>
              </F>
              <F label="Data pag. final"><Input type="date" value={form.final_payment_date} onChange={(e) => setForm({ ...form, final_payment_date: e.target.value })} /></F>
              <F label="Método final" className="md:col-span-2"><Input value={form.final_payment_method} onChange={(e) => setForm({ ...form, final_payment_method: e.target.value })} /></F>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Fotógrafos">
        <div className="space-y-3">
          {(form.slots as any[]).map((s, i) => {
            const slotDist = distribution[i];
            const external = isExternalSlot(i);
            const labelPrefix = external ? "Externo" : `Prism ${i + 1}`;
            const labelSuffix = slotDist ? ` — ${slotLabel(slotDist)}` : "";
            return (
              <PhotogSlot
                key={i}
                label={`${labelPrefix}${labelSuffix}`}
                photographers={photographers}
                slot={s}
                isExternal={external}
                onChange={(patch: any) => {
                  const next = [...form.slots];
                  const merged = { ...next[i], ...patch };
                  if (external) {
                    merged.photographer_id = "";
                    merged.prism_commission = 0;
                  } else {
                    if ("photographer_id" in patch) {
                      const p = photographers.find((x: any) => x.id === merged.photographer_id);
                      merged.prism_commission = Number(p?.prism_commission || 0);
                    }
                    merged.fee = computeFee(merged.photographer_id, i, form.total_value, merged.prism_commission, next);
                  }
                  next[i] = merged;
                  setForm({ ...form, slots: next });
                }}
              />
            );
          })}

          {(() => {
            const rows = (form.slots as any[]).map((s, i) => {
              const external = isExternalSlot(i);
              const filled = external ? !!(s.external_name && String(s.external_name).trim()) : !!s.photographer_id;
              if (!filled) return null;
              const baseFee = Number(s.fee || 0);
              const extrasFee = external ? 0 : extrasForPhotographer(extras, s.photographer_id);
              const fee = baseFee + extrasFee;
              const depositCredit = s.deposit_paid ? Number(s.deposit_amount || 0) : 0;
              const finalCredit = s.final_payment_received
                ? (external ? baseFee : Number(s.final_payment_value || 0))
                : 0;
              const paid = depositCredit + finalCredit;
              const missing = fee - paid;
              const photog = photographers.find((p: any) => p.id === s.photographer_id);
              const name = external
                ? `Externo — ${s.external_name}`
                : `Prism ${i + 1}${photog ? ` (${photog.initials})` : ""}`;
              return { name, baseFee, extrasFee, fee, paid, missing, deposit_paid: s.deposit_paid, final_paid: s.final_payment_received };
            }).filter(Boolean) as any[];
            if (rows.length === 0) return null;
            const totalMissing = rows.reduce((acc, r) => acc + Math.max(0, r.missing), 0);
            return (
              <div className="rounded-md border p-3 bg-muted/20">
                <h4 className="text-sm font-semibold mb-2">Valor final do fotógrafo</h4>
                <div className="space-y-1.5 text-sm">
                  {rows.map((r, i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate">{r.name}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          pacote {EUR(r.baseFee)}
                          {r.extrasFee > 0 ? ` + extras ${EUR(r.extrasFee)}` : ""}
                          {" · "}sinal {r.deposit_paid ? "✓" : "—"} · final {r.final_paid ? "✓" : "—"}
                        </span>
                      </div>
                      <div className="text-right tabular-nums whitespace-nowrap">
                        <span className="font-semibold">{EUR(r.fee)}</span>
                        {r.missing > 0 && <span className="text-xs text-destructive ml-2">falta {EUR(r.missing)}</span>}
                        {r.paid > 0 && <span className="text-xs text-muted-foreground ml-2">(pago {EUR(r.paid)})</span>}
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-1.5 mt-1.5 flex items-center justify-between font-medium">
                    <span>Total em falta</span>
                    <span className="tabular-nums text-destructive">{EUR(totalMissing)}</span>
                  </div>
                </div>
              </div>
            );
          })()}

        </div>
      </Section>

      <Section title="Extras" actions={<Button type="button" size="sm" variant="outline" onClick={addExtra}><Plus className="h-3 w-3 mr-1" />Adicionar</Button>}>
        <div className="space-y-2">
          {extras.map((x, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end p-2 rounded bg-muted/40">
              <div className="col-span-3">
                <Label className="text-xs">Tipo</Label>
                <Select value={x.extra_type} onValueChange={(v) => updateExtra(i, { extra_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EXTRA_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-3">
                <Label className="text-xs">Descrição</Label>
                <Input value={x.description ?? ""} onChange={(e) => updateExtra(i, { description: e.target.value })} />
              </div>
              <div className="col-span-1">
                <Label className="text-xs">Qt</Label>
                <Input type="number" step="0.01" value={x.quantity} onChange={(e) => updateExtra(i, { quantity: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Preço un.</Label>
                <Input type="number" step="0.01" value={x.unit_price} onChange={(e) => updateExtra(i, { unit_price: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Fotógrafo</Label>
                <Select value={x.photographer_id || "none"} onValueChange={(v) => updateExtra(i, { photographer_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">—</SelectItem>{photographers.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.initials}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-1 flex justify-end">
                <Button type="button" size="icon" variant="ghost" onClick={() => removeExtra(i)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <div className="col-span-12 text-xs text-right text-muted-foreground">Subtotal: {EUR(Number(x.quantity || 0) * Number(x.unit_price || 0))}</div>
            </div>
          ))}
          <div className="flex justify-between items-center text-sm bg-muted/40 px-3 py-2 rounded">
            <span>Subtotal extras</span><span className="tabular-nums font-medium">{EUR(extrasTotal)}</span>
          </div>
          <div className="flex justify-between items-center text-base bg-primary/10 px-3 py-2 rounded">
            <span className="font-medium">Total evento (pacote + extras)</span>
            <span className="tabular-nums font-semibold">{EUR(Number(form.total_value || 0) + extrasTotal)}</span>
          </div>
        </div>
      </Section>

      <Section title="Notas">
        <div className="grid gap-3">
          <F label="Notas internas"><Textarea rows={3} value={form.internal_notes} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} /></F>
          <F label="Notas evento (calendário)"><Textarea rows={3} value={form.event_notes} onChange={(e) => setForm({ ...form, event_notes: e.target.value })} /></F>
        </div>
      </Section>

      <div className="flex justify-end sticky bottom-0 bg-background/80 backdrop-blur py-3 border-t">
        <Button onClick={save}>Guardar</Button>
      </div>
    </div>
  );
}

function Section({ title, description, actions, children }: any) {
  return (
    <section className="rounded-lg border bg-card p-4 md:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function F({ label, children, className = "" }: any) {
  return <div className={`space-y-1.5 ${className}`}><Label className="text-xs">{label}</Label>{children}</div>;
}

function PhotogSlot({ photographers, slot, onChange, label, isExternal }: any) {
  const status = slot.final_payment_received ? "Pago" : slot.deposit_paid ? "Sinal" : "Pendente";
  const statusVariant: any = slot.final_payment_received ? "default" : slot.deposit_paid ? "secondary" : "outline";
  const hasPhotog = !!slot.photographer_id;
  const hasExternalName = !!(slot.external_name && String(slot.external_name).trim());
  const filled = isExternal ? hasExternalName : hasPhotog;
  return (
    <div className="rounded-md border p-3 space-y-3 bg-muted/20">
      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-5">
          <Label className="text-xs">{label}</Label>
          {isExternal ? (
            <Input
              placeholder="Nome / iniciais do externo"
              value={slot.external_name ?? ""}
              onChange={(e) => onChange({ external_name: e.target.value })}
            />
          ) : (
            <Select value={slot.photographer_id || "none"} onValueChange={(v) => onChange({ photographer_id: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent><SelectItem value="none">—</SelectItem>{photographers.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.initials} · {p.full_name}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
        {!isExternal && (
          <div className="col-span-2">
            <Label className="text-xs">Comissão €</Label>
            <Input
              type="number"
              step="0.01"
              disabled={!hasPhotog}
              value={slot.prism_commission ?? 0}
              onChange={(e) => onChange({ prism_commission: e.target.value })}
            />
          </div>
        )}
        <div className={isExternal ? "col-span-5" : "col-span-3"}>
          <Label className="text-xs">{isExternal ? "Valor a pagar €" : "Fee (auto)"}</Label>
          {isExternal ? (
            <Input
              type="number"
              step="0.01"
              value={slot.fee ?? 0}
              onChange={(e) => onChange({ fee: Number(e.target.value) || 0 })}
            />
          ) : (
            <div className="h-9 px-3 rounded-md border bg-muted/50 text-sm flex items-center justify-end tabular-nums font-medium text-muted-foreground">
              {hasPhotog ? EUR(Number(slot.fee || 0)) : "—"}
            </div>
          )}
        </div>
        {!isExternal && (
          <div className="col-span-2 flex justify-end">
            <Badge variant={statusVariant}>{status}</Badge>
          </div>
        )}
      </div>

      {!isExternal && filled && (
        <>
          <div className="border-t pt-2">
            <div className="flex items-center gap-2 mb-2">
              <Checkbox id={`dp-${label}`} checked={slot.deposit_paid} onCheckedChange={(c) => onChange({ deposit_paid: !!c })} />
              <label htmlFor={`dp-${label}`} className="text-xs font-medium">Sinal devolvido ao fotógrafo</label>
            </div>
            {slot.deposit_paid && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Valor sinal €</Label>
                  <Input type="number" step="0.01" value={slot.deposit_amount} onChange={(e) => onChange({ deposit_amount: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Data</Label>
                  <Input type="date" value={slot.deposit_paid_date} onChange={(e) => onChange({ deposit_paid_date: e.target.value })} />
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-2">
            <div className="flex items-center gap-2 mb-2">
              <Checkbox id={`fp-${label}`} checked={slot.final_payment_received} onCheckedChange={(c) => onChange({ final_payment_received: !!c })} />
              <label htmlFor={`fp-${label}`} className="text-xs font-medium">Pagamento final do cliente recebido</label>
            </div>
            {slot.final_payment_received && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Valor €</Label>
                  <Input type="number" step="0.01" value={slot.final_payment_value} onChange={(e) => onChange({ final_payment_value: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Data</Label>
                  <Input type="date" value={slot.final_payment_date} onChange={(e) => onChange({ final_payment_date: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Método</Label>
                  <Select value={slot.final_payment_method || "prism"} onValueChange={(v) => onChange({ final_payment_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prism">PRISM/Revolut</SelectItem>
                      <SelectItem value="fotografo">Direto ao fotógrafo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {isExternal && filled && (
        <div className="border-t pt-2">
          <div className="flex items-center gap-2 mb-2">
            <Checkbox id={`fp-ext-${label}`} checked={!!slot.final_payment_received} onCheckedChange={(c) => onChange({ final_payment_received: !!c })} />
            <label htmlFor={`fp-ext-${label}`} className="text-xs font-medium">Pago ao externo</label>
          </div>
          {slot.final_payment_received && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Data</Label>
                <Input type="date" value={slot.final_payment_date ?? ""} onChange={(e) => onChange({ final_payment_date: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Método</Label>
                <Select value={slot.final_payment_method || "prism"} onValueChange={(v) => onChange({ final_payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prism">PRISM/Revolut</SelectItem>
                    <SelectItem value="cliente">Direto pelo cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
