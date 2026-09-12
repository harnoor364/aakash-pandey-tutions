import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Subjects from "@/components/Subjects";
import TestAnalyzer from "@/components/TestAnalyzer";
import Testimonials from "@/components/Testimonials";
import LeadForm from "@/components/LeadForm";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <Subjects />
        <TestAnalyzer />
        <Testimonials />
        <LeadForm />
      </main>
      <Footer />
    </>
  );
}
