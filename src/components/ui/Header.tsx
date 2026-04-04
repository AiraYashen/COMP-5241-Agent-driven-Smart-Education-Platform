"use client";

interface HeaderProps {
  title: string;
  userName?: string;
  userAvatar?: string;
}

export default function Header({ title, userName, userAvatar }: HeaderProps) {
  return (
    <header
      className="flex items-center justify-between px-6 border-b flex-shrink-0 h-[53px]"
      style={{
        background: "var(--header-bg)",
        borderColor: "var(--header-border)",
        color: "var(--foreground)",
      }}
    >
      <h1 className="text-base font-semibold">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Avatar */}
        {userName && (
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
              style={{ background: "var(--accent)" }}
            >
              {userAvatar ? (
                <img src={userAvatar} alt={userName} className="w-full h-full rounded-full object-cover" />
              ) : (
                userName.charAt(0)
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
