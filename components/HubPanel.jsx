"use client";

export function HubPanel({ eyebrow, title, description, cards, onNavigate }) {
  return (
    <section className="panel hub-panel">
      <div className="hub-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <span>{description}</span>
        </div>
      </div>
      <div className="hub-grid">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button className="hub-card" key={card.id} type="button" onClick={() => onNavigate(card.target || card.id)}>
              <span className="hub-card-icon">{Icon && <Icon size={22} />}</span>
              <strong>{card.label}</strong>
              <span>{card.description}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
