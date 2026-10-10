"use client";

import dynamic from "next/dynamic";

const LazyUserProfile = dynamic(
  () =>
    import("@/src/components/dashboard/profile/ui/user-profile").then(
      (mod) => mod.UserProfile,
    ),
  {
    ssr: false,
  },
);

export default function ProfilePage() {
  return <LazyUserProfile />;
}
