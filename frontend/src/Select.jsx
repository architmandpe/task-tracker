import { useEffect, useRef, useState } from "react";
import { IconChevronDown, IconCheckCircle } from "./Icons";

/* Replaces the native <select>, whose dropdown the browser renders itself and
   which therefore ignores the app's theme entirely. Options can carry a colour
   dot so priority and status read at a glance. */
export default function Select({ value, options, onChange, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [dropUp, setDropUp] = useState(false);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  function openList() {
    // Flip upwards when there isn't room below, so the list is never cut off by
    // the bottom of the panel.
    const rect = buttonRef.current?.getBoundingClientRect();
    const needed = Math.min(options.length, 6) * 34 + 12;
    setDropUp(!!rect && window.innerHeight - rect.bottom < needed);
    setActive(selectedIndex);
    setOpen(true);
  }

  function choose(index) {
    setOpen(false);
    buttonRef.current?.focus();
    if (options[index].value !== value) onChange(options[index].value);
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      e.stopPropagation(); // don't also close the panel this select lives in
      setOpen(false);
      buttonRef.current?.focus();
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(active);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const delta = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + delta + options.length) % options.length);
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div className="ui-select" ref={wrapRef}>
      <button
        type="button"
        ref={buttonRef}
        className={`ui-select-trigger${open ? " is-open" : ""}`}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            openList();
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className="ui-select-value">
          {selected?.dot && <span className="ui-dot" style={{ background: selected.dot }} />}
          {selected?.label}
        </span>
        <IconChevronDown className="icon-xs ui-select-caret" />
      </button>

      {open && (
        <ul
          className={`ui-select-list${dropUp ? " drop-up" : ""}`}
          role="listbox"
          tabIndex={-1}
          ref={listRef}
          onKeyDown={onKeyDown}
          aria-activedescendant={`opt-${active}`}
        >
          {options.map((option, i) => (
            <li
              key={option.value}
              id={`opt-${i}`}
              role="option"
              aria-selected={option.value === value}
              className={`ui-select-option${i === active ? " is-active" : ""}${option.value === value ? " is-selected" : ""}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(i)}
            >
              {option.dot && <span className="ui-dot" style={{ background: option.dot }} />}
              <span className="ui-select-option-label">{option.label}</span>
              {option.value === value && <IconCheckCircle className="icon-xs ui-select-tick" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
