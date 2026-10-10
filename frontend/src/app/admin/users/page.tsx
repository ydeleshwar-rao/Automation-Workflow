import { CreateUserForm } from "@/src/components/admin-dashboard/create-user-form";

export default function AdminUsersPage() {
  return (
    <div className="py-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[80vh] flex items-start justify-center">
      <div className="w-full">
        <CreateUserForm />
      </div>
    </div>
  );
}
