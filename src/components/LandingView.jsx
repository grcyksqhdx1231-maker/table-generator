export default function LandingView({ visible, onEnter }) {
  return (
    <section className={`landing ${visible ? "is-visible" : "is-hidden"}`}>
      <div className="landing__inner">
        <p className="landing__eyebrow">Speculative Furniture Study</p>
        <h1 className="landing__title">Table Generator</h1>
        <p className="landing__copy">
          AI-assisted table studies rendered in a quiet editorial space.
        </p>
        <button className="landing__button" onClick={onEnter} type="button">
          Enter The Space
        </button>
      </div>
    </section>
  );
}
