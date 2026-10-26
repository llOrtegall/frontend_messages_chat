"use client";

import { useEffect, useRef, useState } from "react";
import { errorMessage } from "../../application/store.ts";
import { AVATAR_ACCEPT } from "../../domain/rules.ts";
import { useSession } from "../providers.tsx";
import { Avatar } from "./avatar.tsx";

export function ProfileDialog({ onClose }: { onClose: () => void }) {
  const { user, store } = useSession();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  // undefined = keep, null = remove, File = replace
  const [avatar, setAvatar] = useState<{ file: File | null; preview: string | null } | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const avatarRef = useRef(avatar);

  useEffect(() => () => {
    if (avatarRef.current?.preview) URL.revokeObjectURL(avatarRef.current.preview);
  }, []);

  if (!user) return null;

  const pick = (file: File | null) => {
    if (avatar?.preview) URL.revokeObjectURL(avatar.preview);
    const next = { file, preview: file ? URL.createObjectURL(file) : null };
    avatarRef.current = next;
    setAvatar(next);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await store.updateProfile({
        displayName: displayName.trim() !== user.displayName ? displayName : undefined,
        avatar: avatar?.file ?? (avatar ? null : undefined),
      });
      onClose();
    } catch (err) {
      setError(errorMessage(err, "No se pudo guardar el perfil"));
      setSaving(false);
    }
  };

  const shownAvatar = avatar === undefined ? user.avatarUrl : avatar.preview;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="profile-title" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <form onSubmit={(e) => void save(e)} className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-sm mx-4 shadow-2xl space-y-4">
        <h2 id="profile-title" className="text-lg font-bold">Tu perfil</h2>
        {error && <div role="alert" className="bg-red-900/40 border border-red-700 text-red-300 text-sm p-3 rounded-lg">{error}</div>}

        <div className="flex items-center gap-4">
          <Avatar name={displayName || user.displayName} url={shownAvatar} size="lg" />
          <div className="flex flex-col gap-1 text-sm">
            <label className="cursor-pointer text-blue-400 hover:underline has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500 rounded">
              <input type="file" accept={AVATAR_ACCEPT} className="sr-only" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
              Cambiar foto
            </label>
            {shownAvatar && (
              <button type="button" onClick={() => pick(null)} className="text-left text-slate-400 hover:text-red-400">
                Quitar foto
              </button>
            )}
          </div>
        </div>

        <label className="block text-sm font-medium text-slate-300">
          Nombre visible
          <input
            className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            maxLength={64}
            autoFocus
          />
        </label>
        <p className="text-xs text-slate-500">{user.email}</p>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg text-sm">
            Cancelar
          </button>
          <button type="submit" disabled={saving || !displayName.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded-lg text-sm font-medium">
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
