import MessagesLayoutClient from './messages-layout-client';

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col lg:px-4 lg:py-6">
      <MessagesLayoutClient>{children}</MessagesLayoutClient>
    </div>
  );
}
