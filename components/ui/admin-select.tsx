'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

type Option = { value: string; label: string; hint?: string };

function fold(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
}

export function AdminSelect({ value, onChange, options, label, searchable = false }: { value: string; onChange: (value: string) => void; options: Option[]; label?: string; searchable?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [box, setBox] = useState({ top: 0, left: 0, width: 0, maxHeight: 240 });
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const current = options.find((option) => option.value === value);
  const placeholder = options.find((option) => option.value === '')?.label || label || '';
  const choices = searchable ? options.filter((option) => option.value !== '') : options;
  const needle = fold(query.trim());
  const filtered = searchable && needle ? choices.filter((option) => fold(option.label).includes(needle)) : choices;

  function place() {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom - 8;
    setBox({ top: rect.bottom + 4, left: rect.left, width: rect.width, maxHeight: Math.max(120, Math.min(240, below)) });
  }

  function close() {
    setOpen(false);
    setQuery('');
  }

  function choose(next: string) {
    onChange(next);
    close();
    inputRef.current?.blur();
  }

  useEffect(() => {
    if (!open) return;
    place();
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if ((target as HTMLElement).closest?.(`[data-list="${listId}"]`)) return;
      close();
    }
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, listId]);

  useEffect(() => {
    if (!open || !searchable) return;
    if (query.trim()) {
      setActive(0);
      return;
    }
    const selected = choices.findIndex((option) => option.value === value);
    setActive(selected >= 0 ? selected : 0);
  }, [open, query, searchable]);

  useEffect(() => {
    if (!open) return;
    const item = document.getElementById(`${listId}-opt-${active}`);
    const list = item?.closest('[role="listbox"]');
    if (!item || !list) return;
    const top = item.offsetTop;
    const bottom = top + item.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }, [open, active, listId, filtered.length]);

  function onInputKey(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) {
        setQuery('');
        setOpen(true);
        return;
      }
      setActive((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) return;
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      if (!open) return;
      event.preventDefault();
      const option = filtered[active];
      if (option) choose(option.value);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
      inputRef.current?.blur();
    }
  }

  function openSearch() {
    setQuery('');
    setOpen(true);
    inputRef.current?.focus();
  }

  return (
    <div ref={rootRef} className="relative w-full min-w-0">
      {searchable ? (
        <div className={`admin-input flex items-center gap-1 !py-0 !pr-1 focus-within:border-[#2563eb] focus-within:outline focus-within:outline-2 focus-within:outline-[#bfdbfe] ${open ? 'border-[#2563eb] outline outline-2 outline-[#bfdbfe]' : ''}`}>
          <input
            ref={inputRef}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={open && filtered[active] ? `${listId}-opt-${active}` : undefined}
            aria-label={label}
            className="min-w-0 flex-1 bg-transparent py-2 outline-none"
            placeholder={open && current?.value ? current.label : placeholder}
            value={open ? query : (current?.value ? current.label : '')}
            onMouseDown={() => {
              if (!open) openSearch();
            }}
            onFocus={() => {
              if (!open) openSearch();
            }}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onKeyDown={onInputKey}
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label={label ? `Mở ${label}` : 'Mở danh sách'}
            className="flex size-8 shrink-0 items-center justify-center text-slate-500"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (open) {
                close();
                inputRef.current?.blur();
                return;
              }
              openSearch();
            }}
          >
            <ChevronDown className="size-4" aria-hidden />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="admin-input flex w-full items-center justify-between gap-2 text-left"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={label || current?.label}
          onClick={() => setOpen((shown) => !shown)}
        >
          <span className="min-w-0 truncate">{current?.label}</span>
          <ChevronDown className="size-4 shrink-0 text-slate-500" aria-hidden />
        </button>
      )}
      {open && createPortal(
        <ul
          id={listId}
          data-list={listId}
          role="listbox"
          className="fixed z-50 overflow-auto rounded-[10px] border border-slate-200 bg-white py-1 shadow-lg"
          style={{ top: box.top, left: box.left, width: box.width, maxHeight: box.maxHeight }}
        >
          {filtered.map((option, index) => (
            <li key={option.value || 'empty'} id={`${listId}-opt-${index}`}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={`flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left text-sm ${searchable && index === active ? 'bg-blue-100 text-blue-800' : option.value === value ? 'bg-blue-50 text-blue-700' : 'text-slate-800 hover:bg-slate-50'}`}
                onClick={() => choose(option.value)}
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {option.hint && <span className="admin-money shrink-0 text-slate-500">{option.hint}</span>}
              </button>
            </li>
          ))}
          {searchable && !filtered.length && <li className="px-3 py-2 text-sm text-slate-500">Không có món</li>}
        </ul>,
        document.querySelector('.admin') ?? document.body,
      )}
    </div>
  );
}
