type CaptureStepProps = {
  onPick: (file: File) => void;
  onManual: () => void;
};

export function CaptureStep({ onPick, onManual }: CaptureStepProps) {
  return (
    <section className="step-panel" aria-labelledby="capture-title">
      <div className="step-copy">
        <h2 id="capture-title">Photograph the receipt</h2>
        <p>Next you’ll check the lines, then split them.</p>
      </div>
      <div className="capture-actions">
        <button type="button" className="button" data-testid="capture-camera" onClick={() => document.getElementById("camera-input")?.click()}>
          Take photo
        </button>
        <button type="button" className="button secondary" data-testid="capture-upload" onClick={() => document.getElementById("upload-input")?.click()}>
          Upload a photo
        </button>
        <button type="button" className="text-button" data-testid="capture-manual" onClick={onManual}>
          Type the items instead
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
    </section>
  );
}
