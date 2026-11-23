import { useEffect, useMemo, useRef, useState } from "react";
import { billHasWork, emptyBill, serializeBill, shouldWarnOnLeave, type BillSnapshot } from "./billSnapshot";
import { CaptureStep } from "./components/CaptureStep";
import { ReviewStep } from "./components/ReviewStep";
import { PeopleStep } from "./components/PeopleStep";
import { AssignStep } from "./components/AssignStep";
import { LegalPage } from "./components/LegalPage";
import { SummaryStep } from "./components/SummaryStep";
import { currencyFromMark, currencySymbol, DEFAULT_CURRENCY, fractionDigits } from "./currency";
import { foldPersonName } from "./names";
import { clearDraft, loadDraft, saveDraft } from "./draft";
import { newId } from "./id";
import { legalPage } from "./legalPath";
import { friendlyReadError, recognizeReceipt, shrinkImage, type Recognition } from "./ocr/recognize";
import { decodeShare, encodeShare, shareTokenFromHash, whoPaysWhatText } from "./share";
import { slipStamp } from "./slipDate";
import { splitBill, splitEvenly } from "./split/splitBill";
import { PERSON_COLORS, type Extra, type Item, type Person, type StepId } from "./types";

function openingBill(): { bill: BillSnapshot; shared: string | null } {
  const blank = emptyBill(DEFAULT_CURRENCY);
  if (typeof window === "undefined") return { bill: blank, shared: null };
  const token = shareTokenFromHash(window.location.hash);
  if (token) {
    const shared = decodeShare(token);
    if (shared) {
      const bill = { ...shared, step: "summary" as StepId };
      return { bill, shared: serializeBill(bill) };
    }
  }
  return { bill: loadDraft() ?? blank, shared: null };
}

function blankItem(): Item {
  return { id: newId(), name: "", quantity: 1, priceCents: 0, assignments: [], shareMode: "even" };
}

export default function App() {
  const opened = useRef(openingBill());
  const sharedSnapshot = useRef(opened.current.shared);
  const [step, setStep] = useState<StepId>(opened.current.bill.step);
  const [currency, setCurrency] = useState(opened.current.bill.currency);
  const [items, setItems] = useState<Item[]>(opened.current.bill.items);
  const [taxCents, setTaxCents] = useState(opened.current.bill.taxCents);
  const [tipCents, setTipCents] = useState(opened.current.bill.tipCents);
  const [serviceCents, setServiceCents] = useState(opened.current.bill.serviceCents);
  const [otherExtras, setOtherExtras] = useState<Extra[]>(opened.current.bill.otherExtras);
  const [detectedTotalCents, setDetectedTotalCents] = useState<number | null>(opened.current.bill.detectedTotalCents);
  const [people, setPeople] = useState<Person[]>(opened.current.bill.people);
  const [evenCount, setEvenCount] = useState<number | null>(opened.current.bill.evenCount);
  const [splitMode, setSplitMode] = useState<"even" | "items" | null>(opened.current.bill.splitMode);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(opened.current.bill.selectedItemId);
  const [legal, setLegal] = useState(() =>
    typeof window === "undefined" ? null : legalPage(window.location.pathname, import.meta.env.BASE_URL),
  );
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const bill = useMemo<BillSnapshot>(
    () => ({
      step,
      currency,
      items,
      taxCents,
      tipCents,
      serviceCents,
      otherExtras,
      detectedTotalCents,
      people,
      evenCount,
      splitMode,
      selectedItemId,
    }),
    [step, currency, items, taxCents, tipCents, serviceCents, otherExtras, detectedTotalCents, people, evenCount, splitMode, selectedItemId],
  );
  const billJson = serializeBill(bill);
  const savedRef = useRef(serializeBill(opened.current.bill));

  useEffect(() => {
    const syncLegal = () => setLegal(legalPage(window.location.pathname, import.meta.env.BASE_URL));
    window.addEventListener("popstate", syncLegal);
    return () => window.removeEventListener("popstate", syncLegal);
  }, []);

  useEffect(() => {
    const snapshot = billJson;
    const handle = window.setTimeout(() => {
      if (sharedSnapshot.current && snapshot === sharedSnapshot.current) return;
      if (!billHasWork(bill)) {
        clearDraft();
        savedRef.current = snapshot;
        return;
      }
      saveDraft(bill);
      savedRef.current = snapshot;
    }, 400);
    return () => window.clearTimeout(handle);
  }, [bill, billJson]);

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!shouldWarnOnLeave(billJson, savedRef.current, billHasWork(bill))) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [bill, billJson]);

  const extras = useMemo(
    () =>
      [
        { id: "tax", label: "Tax", amountCents: taxCents },
        { id: "tip", label: "Tip", amountCents: tipCents },
        { id: "service", label: "Service charge", amountCents: serviceCents },
        ...otherExtras.map((extra) => ({
          id: extra.id,
          label: extra.label.trim() || "Extra",
          amountCents: extra.amountCents,
        })),
      ].filter((extra) => extra.amountCents !== 0),
    [taxCents, tipCents, serviceCents, otherExtras],
  );

  const result = useMemo(
    () =>
      splitBill({
        people: people.map((person) => ({ id: person.id, name: person.name })),
        items: items.map((item) => ({
          id: item.id,
          name: item.name.trim() || "Untitled item",
          priceCents: item.priceCents,
          quantity: item.quantity,
          assignments: item.assignments,
        })),
        extras,
      }),
    [people, items, extras],
  );

  const mark = currencySymbol(currency);
  const digits = fractionDigits(currency);
  const slipDate = useMemo(() => slipStamp(new Date()), []);
  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const token = encodeShare({ ...bill, step: "summary" });
    const url = new URL(window.location.href);
    url.hash = `s=${token}`;
    return url.toString();
  }, [bill]);
  const exportText = useMemo(() => {
    const shares =
      splitMode === "even" && evenCount != null
        ? splitEvenly(result.billTotalCents, evenCount).map((cents, index) => ({ label: String(index + 1), cents }))
        : result.people.map((person) => ({ label: person.name || "Someone", cents: person.totalCents }));
    return whoPaysWhatText({
      dateLabel: slipDate.label,
      symbol: mark,
      lines: shares,
      totalCents: result.billTotalCents,
      fractionDigits: digits,
    });
  }, [splitMode, evenCount, result, slipDate.label, mark, digits]);

  function rememberPhoto(file: File) {
    const url = URL.createObjectURL(file);
    setPhotoUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return url;
    });
  }

  function applyRecognition(parsed: Recognition) {
    setItems(
      parsed.items.map((item) => ({
        id: newId(),
        name: item.name,
        quantity: item.quantity,
        priceCents: item.priceCents,
        assignments: [],
        shareMode: "even",
        ...(item.flagged ? { needsCheck: true } : {}),
      })),
    );
    setTaxCents(parsed.taxCents ?? 0);
    setTipCents(parsed.tipCents ?? 0);
    setServiceCents(parsed.serviceCents ?? 0);
    setOtherExtras(
      parsed.otherExtras.map((extra) => ({
        id: newId(),
        label: extra.label,
        amountCents: extra.amountCents,
      })),
    );
    setDetectedTotalCents(parsed.totalCents);
    if (parsed.currencySymbol) setCurrency(currencyFromMark(parsed.currencySymbol));
    setSelectedItemId(null);
  }

  async function readFile(file: File) {
    if (file.type && !file.type.startsWith("image/")) {
      setReadError("Choose an image of the receipt.");
      return;
    }
    const request = ++requestRef.current;
    setReadError(null);
    rememberPhoto(file);
    setReading(true);
    setItems([]);
    setStep("review");
    try {
      const prepared = await shrinkImage(file);
      if (request !== requestRef.current) return;
      const parsed = await recognizeReceipt(prepared);
      if (request !== requestRef.current) return;
      const empty = parsed.items.length === 0 && parsed.totalCents == null && parsed.taxCents == null;
      if (empty) {
        setReadError("No lines came back. Add each item below.");
        setItems([blankItem()]);
      } else {
        applyRecognition(parsed);
      }
    } catch (error) {
      if (request !== requestRef.current) return;
      setReadError(friendlyReadError(error));
      setItems([blankItem()]);
    } finally {
      if (request === requestRef.current) setReading(false);
    }
  }

  function startBlank() {
    requestRef.current += 1;
    setReading(false);
    setReadError(null);
    setItems([blankItem()]);
    setTaxCents(0);
    setTipCents(0);
    setServiceCents(0);
    setOtherExtras([]);
    setDetectedTotalCents(null);
    setSelectedItemId(null);
    setStep("review");
  }

  function reset() {
    if (items.length > 0 || people.length > 0) {
      const ok = window.confirm("Clear this bill and start over?");
      if (!ok) return;
    }
    requestRef.current += 1;
    setReading(false);
    setReadError(null);
    setStep("capture");
    setCurrency(DEFAULT_CURRENCY);
    setItems([]);
    setTaxCents(0);
    setTipCents(0);
    setServiceCents(0);
    setOtherExtras([]);
    setDetectedTotalCents(null);
    setPeople([]);
    setEvenCount(null);
    setSplitMode(null);
    setSelectedItemId(null);
    setPhotoUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    const blank = emptyBill(DEFAULT_CURRENCY);
    clearDraft();
    savedRef.current = serializeBill(blank);
    sharedSnapshot.current = null;
  }

  function addPerson(name: string) {
    const trimmed = name.trim();
    if (people.some((person) => foldPersonName(person.name) === foldPersonName(trimmed))) return false;
    setPeople((current) => {
      const used = new Set(current.map((person) => person.color));
      const color = PERSON_COLORS.find((entry) => !used.has(entry)) ?? PERSON_COLORS[current.length % PERSON_COLORS.length];
      return [...current, { id: newId(), name, color }];
    });
    return true;
  }

  function removePerson(id: string) {
    setPeople((current) => current.filter((person) => person.id !== id));
    setItems((current) =>
      current.map((item) => ({
        ...item,
        assignments: item.assignments.filter((assignment) => assignment.personId !== id),
      })),
    );
  }

  return (
    <div className="slip">
      <a className="skip" href="#main">
        Skip to the bill
      </a>
      <p className="slip-head">
        <span className="store">Splitit</span>
        <time className="slip-date" dateTime={slipDate.iso}>
          {slipDate.label}
        </time>
      </p>
      <main id="main">
        {legal ? (
          <LegalPage kind={legal} homeHref={import.meta.env.BASE_URL || "/"} />
        ) : null}
        {!legal && step === "capture" && <CaptureStep onPick={(file) => void readFile(file)} onManual={startBlank} />}

        {!legal && step === "review" && (
          <ReviewStep
            symbol={mark}
            fractionDigits={digits}
            currency={currency}
            items={items}
            taxCents={taxCents}
            tipCents={tipCents}
            serviceCents={serviceCents}
            otherExtras={otherExtras}
            detectedTotalCents={detectedTotalCents}
            photoUrl={photoUrl}
            reading={reading}
            note={readError}
            onCurrency={setCurrency}
            onItem={(id, patch) =>
              setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
            }
            onRemoveItem={(id) => {
              setItems((current) => current.filter((item) => item.id !== id));
              setSelectedItemId((current) => (current === id ? null : current));
            }}
            onAddItem={(item) => setItems((current) => [...current, item])}
            onTax={setTaxCents}
            onTip={setTipCents}
            onService={setServiceCents}
            onExtra={(id, patch) =>
              setOtherExtras((current) => current.map((extra) => (extra.id === id ? { ...extra, ...patch } : extra)))
            }
            onRemoveExtra={(id) => setOtherExtras((current) => current.filter((extra) => extra.id !== id))}
            onAddExtra={() =>
              setOtherExtras((current) => [...current, { id: newId(), label: "Extra", amountCents: 0 }])
            }
            onBack={() => setStep("capture")}
            onNext={() => {
              setSplitMode(null);
              setStep("people");
            }}
          />
        )}

        {!legal && step === "people" && (
          <PeopleStep
            people={people}
            mode={splitMode}
            evenCount={evenCount}
            onMode={setSplitMode}
            onAdd={addPerson}
            onRemove={removePerson}
            onEven={(count) => {
              setEvenCount(count);
              setSplitMode("even");
              setStep("summary");
            }}
            onBack={() => {
              if (splitMode != null) {
                setSplitMode(null);
                return;
              }
              setStep("review");
            }}
            onNext={() => setStep("assign")}
          />
        )}

        {!legal && step === "assign" && (
          <AssignStep
            symbol={mark}
            fractionDigits={digits}
            items={items}
            people={people}
            selectedItemId={selectedItemId}
            result={result}
            onSelect={setSelectedItemId}
            onToggle={(itemId, personId) =>
              setItems((current) =>
                current.map((item) => {
                  if (item.id !== itemId) return item;
                  const exists = item.assignments.some((assignment) => assignment.personId === personId);
                  return {
                    ...item,
                    assignments: exists
                      ? item.assignments.filter((assignment) => assignment.personId !== personId)
                      : [...item.assignments, { personId, weight: 1 }],
                  };
                }),
              )
            }
            onAssign={(itemId, personId) => {
              setSelectedItemId(itemId);
              setItems((current) =>
                current.map((item) => {
                  if (item.id !== itemId) return item;
                  if (item.assignments.some((assignment) => assignment.personId === personId)) return item;
                  return { ...item, assignments: [...item.assignments, { personId, weight: 1 }] };
                }),
              );
            }}
            onShareMode={(itemId, mode) =>
              setItems((current) =>
                current.map((item) => {
                  if (item.id !== itemId) return item;
                  if (mode === "even") {
                    return {
                      ...item,
                      shareMode: "even",
                      assignments: item.assignments.map((assignment) => ({ ...assignment, weight: 1 })),
                    };
                  }
                  return { ...item, shareMode: "custom" };
                }),
              )
            }
            onWeight={(itemId, personId, weight) =>
              setItems((current) =>
                current.map((item) =>
                  item.id === itemId
                    ? {
                        ...item,
                        shareMode: "custom",
                        assignments: item.assignments.map((assignment) =>
                          assignment.personId === personId ? { ...assignment, weight } : assignment,
                        ),
                      }
                    : item,
                ),
              )
            }
            onBack={() => setStep("people")}
            onNext={() => {
              setEvenCount(null);
              setSplitMode("items");
              setStep("summary");
            }}
          />
        )}

        {!legal && step === "summary" && (
          <SummaryStep
            symbol={mark}
            fractionDigits={digits}
            items={items}
            people={people}
            result={result}
            evenShares={evenCount == null ? null : splitEvenly(result.billTotalCents, evenCount)}
            shareUrl={shareUrl}
            exportText={exportText}
            onBack={() => setStep(splitMode === "even" ? "people" : "assign")}
            onReset={reset}
          />
        )}
      </main>
    </div>
  );
}
