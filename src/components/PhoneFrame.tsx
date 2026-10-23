import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  tone?: "dark" | "light";
};

// A slim phone bezel around a real screenshot of the app. Screenshots are 219x476 phone viewports captured at 2x.
export default function PhoneFrame({ src, alt, className = "", priority = false, tone = "dark" }: Props) {
  return (
    <div
      className={`relative rounded-[2.2rem] p-[7px] shadow-[0_30px_80px_-30px_rgba(12,59,46,.55)] ${
        tone === "dark" ? "bg-yebo-deep ring-1 ring-white/10" : "bg-white ring-1 ring-yebo-deep/10"
      } ${className}`}
    >
      <div className="relative aspect-[219/476] overflow-hidden rounded-[1.75rem] bg-yebo-chalk">
        <Image src={src} alt={alt} fill priority={priority} sizes="(max-width: 640px) 70vw, 280px" className="object-cover object-top" />
      </div>
    </div>
  );
}
