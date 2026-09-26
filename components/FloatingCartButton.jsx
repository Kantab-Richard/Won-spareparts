"use client";

import { useEffect, useRef, useState } from "react";
import { ShoppingCart } from "lucide-react";

const positions = {
  "bottom-right": { bottom: 22, right: 22 },
  "bottom-left": { bottom: 22, left: 22 },
  "top-right": { top: 22, right: 22 },
  "top-left": { top: 22, left: 22 },
};

function nearestCorner(x, y) {
  if (typeof window === "undefined") return "bottom-right";
  const horizontal = x < window.innerWidth / 2 ? "left" : "right";
  const vertical = y < window.innerHeight / 2 ? "top" : "bottom";
  return `${vertical}-${horizontal}`;
}

export function FloatingCartButton({ count, active, onOpen }) {
  const [position, setPosition] = useState("bottom-right");
  const [dragPoint, setDragPoint] = useState(null);
  const movedRef = useRef(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("wonspareparts-cart-position");
    if (stored && positions[stored]) setPosition(stored);
  }, []);

  function savePosition(nextPosition) {
    setPosition(nextPosition);
    window.localStorage.setItem("wonspareparts-cart-position", nextPosition);
  }

  function startDrag(event) {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    movedRef.current = false;
    setDragPoint({ x: event.clientX, y: event.clientY });
  }

  function moveDrag(event) {
    if (!dragPoint) return;
    const distance = Math.hypot(event.clientX - dragPoint.x, event.clientY - dragPoint.y);
    if (distance > 8) movedRef.current = true;
  }

  function endDrag(event) {
    if (!dragPoint) return;
    if (movedRef.current) {
      savePosition(nearestCorner(event.clientX, event.clientY));
    } else {
      onOpen();
    }
    setDragPoint(null);
  }

  return (
    <button
      aria-label={`Open sale cart with ${count} item${count === 1 ? "" : "s"}`}
      className={active ? "floating-cart-button active" : "floating-cart-button"}
      type="button"
      style={positions[position]}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={() => setDragPoint(null)}
    >
      <ShoppingCart size={24} />
      <span className="floating-cart-count">{count}</span>
      <span className="floating-cart-label">Cart</span>
    </button>
  );
}
