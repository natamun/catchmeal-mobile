interface SwitchProps {
  isOn: boolean;
  onChange: (isOn: boolean) => void;
  disabled?: boolean;
}

/** An on/off switch like Android's: a track with a sliding thumb. */
export function Switch({ isOn, onChange, disabled = false }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      disabled={disabled}
      onClick={() => onChange(!isOn)}
      className={`tap-area relative flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        isOn ? 'bg-theme-500' : 'bg-theme-200'
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full shadow-sm transition-transform ${
          isOn ? 'translate-x-5 bg-on-accent' : 'bg-surface'
        }`}
      />
    </button>
  );
}
