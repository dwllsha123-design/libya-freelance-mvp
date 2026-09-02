import MessagesLayoutClient from './messages-layout-client';

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 py-4 sm:py-6">
      <MessagesLayoutClient>{children}</MessagesLayoutClient>
    </div>
  );
}
