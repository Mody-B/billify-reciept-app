type LegalPageProps = {
  kind: "privacy" | "terms";
  homeHref: string;
};

export function LegalPage({ kind, homeHref }: LegalPageProps) {
  const privacy = kind === "privacy";
  return (
    <section className="step-panel" aria-labelledby="legal-title">
      <div className="step-copy">
        <h2 id="legal-title">{privacy ? "Privacy" : "Terms"}</h2>
        {privacy ? (
          <>
            <p>Splitit keeps a draft of the bill in this browser so a refresh does not wipe it. That draft stays on this device.</p>
            <p>A share link puts the bill in the address. Anyone with the link can see the same shares. There are no accounts.</p>
            <p>A receipt photo is sent to the reader only to turn it into lines. You can type the lines instead.</p>
            <p>The page loads Google AdSense so the site can be verified and, where Google serves one, show an ad. Google may use cookies for that.</p>
          </>
        ) : (
          <>
            <p>Splitit divides a receipt so the shares add up to the bill. Check the lines before you rely on them.</p>
            <p>The totals are a convenience, not a bill from the restaurant and not legal or tax advice.</p>
            <p>A share link shows the same split to whoever opens it. You choose who receives that link.</p>
          </>
        )}
      </div>
      <div className="step-actions">
        <a className="button" href={homeHref}>
          Back to Splitit
        </a>
      </div>
    </section>
  );
}
