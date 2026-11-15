import { useMemo, useRef, useState } from "react";
import { CaptureStep } from "./components/CaptureStep";
import { ReviewStep } from "./components/ReviewStep";
import { PeopleStep } from "./components/PeopleStep";
import { AssignStep } from "./components/AssignStep";
import { SummaryStep } from "./components/SummaryStep";
import { newId } from "./id";
import { friendlyReadError, recognizeReceipt, shrinkImage, type Recognition } from "./ocr/recognize";
import { splitBill } from "./split/splitBill";
import { PERSON_COLORS, type Extra, type Item, type Person, type StepId } from "./types";

function blankItem(): Item {
  return { id: newId(), name: "", quantity: 1, priceCents: 0, assignments: [], shareMode: "even" };
}

export default function App() {
  const [step, setStep] = useState<StepId>("capture");
  const [symbol, setSymbol] = useState("$");
  const [items, setItems] = useState<Item[]>([]);
  const [taxCents, setTaxCents] = useState(0);
  const [tipCents, setTipCents] = useState(0);
  const [serviceCents, setServiceCents] = useState(0);
  const [otherExtras, setOtherExtras] = useState<Extra[]>([]);
  const [detectedTotalCents, setDetectedTotalCents] = useState<number | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const requestRef = useRef(0);

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
          assignments: item.assignments,
        })),
        extras,
      }),
    [people, items, extras],
  );

  const mark = symbol.trim() || "$";

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
    if (parsed.currencySymbol) setSymbol(parsed.currencySymbol);
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
    setSymbol("$");
    setItems([]);
    setTaxCents(0);
    setTipCents(0);
    setServiceCents(0);
    setOtherExtras([]);
    setDetectedTotalCents(null);
    setPeople([]);
    setSelectedItemId(null);
    setPhotoUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }

  function addPerson(name: string) {
    setPeople((current) => {
      const used = new Set(current.map((person) => person.color));
      const color = PERSON_COLORS.find((entry) => !used.has(entry)) ?? PERSON_COLORS[current.length % PERSON_COLORS.length];
      return [...current, { id: newId(), name, color }];
    });
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
      <p className="store">Splitit</p>
      <main id="main">
        {step === "capture" && <CaptureStep onPick={(file) => void readFile(file)} onManual={startBlank} />}

        {step === "review" && (
          <ReviewStep
            symbol={symbol}
            items={items}
            taxCents={taxCents}
            tipCents={tipCents}
            serviceCents={serviceCents}
            otherExtras={otherExtras}
            detectedTotalCents={detectedTotalCents}
            photoUrl={photoUrl}
            reading={reading}
            note={readError}
            onSymbol={setSymbol}
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
            onNext={() => setStep("people")}
          />
        )}

        {step === "people" && (
          <PeopleStep
            people={people}
            onAdd={addPerson}
            onRemove={removePerson}
            onBack={() => setStep("review")}
            onNext={() => setStep("assign")}
          />
        )}

        {step === "assign" && (
          <AssignStep
            symbol={mark}
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
            onNext={() => setStep("summary")}
          />
        )}

        {step === "summary" && (
          <SummaryStep
            symbol={mark}
            items={items}
            people={people}
            result={result}
            onBack={() => setStep("assign")}
            onReset={reset}
          />
        )}
      </main>
    </div>
  );
}
