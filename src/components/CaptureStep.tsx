type CaptureStepProps = {
  photoUrl: string | null;
  reading: { progress: number; status: string } | null;
  error: string | null;
  onPick: (file: File) => void;
  onCancelRead: () => void;
  onManual: () => void;
  onSample: () => void;
};

export function CaptureStep({
  photoUrl,
  reading,
  error,
  onPick,
  onCancelRead,
  onManual,
  onSample,
}: CaptureStepProps) {
  return (
    <section className="step-panel" aria-labelledby="capture-title">
      <div className="step-copy">
        <h2 id="capture-title">Start from a receipt</h2>
        <p>
          Take a photo or upload one. Splitit reads it on this device, then you can fix anything it
          missed. No account, no upload.
        </p>
      </div>

      <div className="capture-actions">
        <button type="button" className="button" data-testid="capture-camera" onClick={() => document.getElementById("camera-input")?.click()}>
          Take photo
        </button>
        <button type="button" className="button secondary" data-testid="capture-upload" onClick={() => document.getElementById("upload-input")?.click()}>
          Upload image
        </button>
        <button type="button" className="button secondary" data-testid="capture-manual" onClick={onManual}>
          Enter by hand
        </button>
        <input
          id="camera-input"
          className="file-input"
          type="file"
          accept="image/*"
          capture="environment"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onPick(file);
          }}
        />
        <input
          id="upload-input"
          className="file-input"
          type="file"
          accept="image/*"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onPick(file);
          }}
        />
      </div>

      {photoUrl && (
        <figure className="preview">
          <img src={photoUrl} alt="Receipt you selected" />
        </figure>
      )}

      {reading && (
        <div className="reader" role="status" aria-live="polite">
          <div className="reader-top">
            <strong>{reading.status}</strong>
            <span>{Math.round(reading.progress * 100)}%</span>
          </div>
          <div className="reader-track" aria-hidden="true">
            <span style={{ width: `${Math.round(reading.progress * 100)}%` }} />
          </div>
          <p>The photo stays on this device. The first read downloads the English language files.</p>
          <button type="button" className="button ghost" onClick={onCancelRead}>
            Cancel
          </button>
        </div>
      )}

      {error && (
        <p className="flag" role="alert">
          {error}
        </p>
      )}

      <div className="sample-row">
        <button type="button" className="text-button" data-testid="capture-sample" onClick={onSample}>
          Try the diner sample
        </button>
        <p>A short bill with tax, service, and tip, so you can practice the split.</p>
      </div>
    </section>
  );
}
