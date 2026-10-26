"use client";

import { useState } from "react";
import { useChat, useSession } from "../providers.tsx";
import { ChatView } from "./chat-view.tsx";
import { Avatar } from "./avatar.tsx";
import { VerifyEmailBanner } from "./email-flows.tsx";
import { ProfileDialog } from "./profile-dialog.tsx";
import { NewConversationModal } from "./new-conversation-modal.tsx";
import { RoomsList } from "./rooms-list.tsx";
import { UsersList } from "./users-list.tsx";

type Tab = "chats" | "users";

export function ChatLayout() {
  const { selectedRoomId, unread, connection } = useChat();
  const { store: session, user } = useSession();
  const [tab, setTab] = useState<Tab>("chats");
  const [showNew, setShowNew] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const hasUnread = Object.values(unread).some((n) => n > 0);

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100">
      <aside className="w-64 flex flex-col border-r border-slate-700">
        <div className="flex gap-1 p-2 border-b border-slate-700" role="tablist">
          {(["chats", "users"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              id={`tab-${t}`}
              aria-controls="sidebar-panel"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition relative ${
                tab === t ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:text-slate-300"
              }`}
            >
              {t === "chats" ? "Chats" : "Usuarios"}
              {t === "chats" && tab !== "chats" && hasUnread && (
                <>
                  <span className="absolute top-0.5 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full" aria-hidden />
                  <span className="sr-only"> (mensajes sin leer)</span>
                </>
              )}
            </button>
          ))}
        </div>

        <div id="sidebar-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="flex-1 overflow-hidden flex flex-col">
          {tab === "chats" ? <RoomsList onNewConversation={() => setShowNew(true)} /> : <UsersList onOpened={() => setTab("chats")} />}
        </div>

        <div className="p-3 border-t border-slate-700 space-y-2">
          {user && (
            <button onClick={() => setShowProfile(true)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-800 text-left" title="Editar perfil">
              <Avatar name={user.displayName} url={user.avatarUrl} />
              <span className="flex-1 min-w-0 truncate text-sm">{user.displayName}</span>
              <span className="text-xs text-slate-400">Perfil</span>
            </button>
          )}
          <button
            onClick={() => void session.logout()}
            className="w-full bg-slate-800 hover:bg-red-900/60 hover:text-red-400 text-slate-400 font-medium py-2 rounded-lg transition text-sm"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <VerifyEmailBanner />
        <div role="status" aria-live="polite">
          {connection !== "open" && (
            <p className="px-4 py-1.5 bg-red-900/40 border-b border-red-800 text-red-200 text-sm">
              {connection === "connecting" ? "Conectando…" : "Sin conexión. Reintentando…"} Los mensajes se sincronizarán al reconectar.
            </p>
          )}
        </div>
        {selectedRoomId ? (
          <ChatView key={selectedRoomId} roomId={selectedRoomId} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-center text-slate-400">
            <div>
              <p className="text-lg font-semibold mb-1">Sin conversación activa</p>
              <p className="text-sm">Selecciona un chat o ve a Usuarios para iniciar uno</p>
            </div>
          </div>
        )}
      </main>

      {showNew && <NewConversationModal onClose={() => setShowNew(false)} />}
      {showProfile && <ProfileDialog onClose={() => setShowProfile(false)} />}
    </div>
  );
}
