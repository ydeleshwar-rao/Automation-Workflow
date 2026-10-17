import { getPasswordStrength, MAX_PASSWORD_STRENGTH_SCORE } from "./password.utils";

const STRENGTH_SEGMENTS = Array.from({ length: MAX_PASSWORD_STRENGTH_SCORE }, (_, index) => index + 1);

/** Five-segment bar + label shown under a new-password field. Renders nothing for an empty password. */
export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const strength = getPasswordStrength(password);

  return (
    <div className="space-y-1.5 mt-0.5 animate-in fade-in duration-200">
      <div className="flex gap-1">
        {STRENGTH_SEGMENTS.map((segment) => (
          <div
            key={segment}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              segment <= strength.score ? strength.barColor : "bg-border"
            }`}
          />
        ))}
      </div>
      <p className={`text-[11px] font-medium ${strength.textColor}`}>{strength.label}</p>
    </div>
  );
}
