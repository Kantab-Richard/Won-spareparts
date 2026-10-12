"use client";

import { useEffect, useRef, useState } from "react";
import { Boxes, ShoppingCart } from "lucide-react";

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

export function FloatingCartButton({ count, active, onOpen, shortcut = "cart" }) {
  const isItems = shortcut === "items";
  const storageKey = `wonspareparts-${shortcut}-position`;
  const [position, setPosition] = useState("bottom-right");
  const [dragPoint, setDragPoint] = useState(null);
  const movedRef = useRef(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored && positions[stored]) setPosition(stored);
    } catch {}
  }, [storageKey]);

  function savePosition(nextPosition) {
    setPosition(nextPosition);
    try {
      window.localStorage.setItem(storageKey, nextPosition);
    } catch {}
  }

  function startDrag(event) {
    if (event.button !== 0) return;
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
    }
    setDragPoint(null);
  }

  const placement = { ...positions[position] };
  const verticalEdge = position.startsWith("top") ? "top" : "bottom";
  placement[verticalEdge] = `calc(${isItems ? 98 : 22}px + env(safe-area-inset-${verticalEdge}))`;

  return (
    <button
      aria-label={isItems ? "Open item list" : `Open sale cart with ${count} item${count === 1 ? "" : "s"}`}
      title={isItems ? "Items" : "Sale cart"}
      className={active ? "floating-cart-button active" : "floating-cart-button"}
      type="button"
      style={placement}
      onClick={() => {
        if (!movedRef.current) onOpen();
        movedRef.current = false;
      }}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={() => {
        movedRef.current = true;
        setDragPoint(null);
      }}
    >
      {isItems ? <Boxes size={24} /> : <ShoppingCart size={24} />}
      {!isItems && <span className="floating-cart-count">{count}</span>}
      <span className="floating-cart-label">{isItems ? "Items" : "Cart"}</span>
    </button>
  );
}
