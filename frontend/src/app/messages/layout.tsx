import MessagesLayoutClient from './messages-layout-client';

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 py-6">
      <MessagesLayoutClient>{children}</MessagesLayoutClient>
    </div>
  );
}
