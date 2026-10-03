import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function LocationInput({ id, label, placeholder, value, onSelect }) {
  const [query, setQuery] = useState(value?.name || '');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setQuery(value?.name || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onSelect(null); // clear selected coords until a suggestion is picked

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/geocode`, { params: { q: val } });
        setSuggestions(res.data.results || []);
        setOpen(true);
      } catch (err) {
        console.error('Geocode error:', err);
        setSuggestions([]);
      }
    }, 400);
  };

  const handlePick = (item) => {
    setQuery(item.display_name);
    setOpen(false);
    setSuggestions([]);
    onSelect({ name: item.display_name, lat: item.lat, lon: item.lon });
  };

  return (
    <div className="field-group location-input" ref={wrapperRef}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="suggestions-dropdown">
          {suggestions.map((item, idx) => (
            <li key={idx} onClick={() => handlePick(item)}>
              {item.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default LocationInput;