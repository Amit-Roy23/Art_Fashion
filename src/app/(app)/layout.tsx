import { Ready } from "@/components/Providers";
import { Shell } from "@/components/Shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Ready>
      <Shell>{children}</Shell>
    </Ready>
  );
}
