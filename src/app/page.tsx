import LandingHeader from "@/components/LandingHeader";
import LandingHero from "@/components/LandingHero";
import WorkflowSection from "@/components/WorkflowSection";
import ProductStorySection from "@/components/ProductStorySection";
import ClosingSection from "@/components/ClosingSection";
import LandingFooter from "@/components/LandingFooter";

export default function Home() {
  return (
    <>
      <LandingHeader />
      <main>
        <LandingHero />
        <WorkflowSection />
        <ProductStorySection />
        <ClosingSection />
      </main>
      <LandingFooter />
    </>
  );
}
