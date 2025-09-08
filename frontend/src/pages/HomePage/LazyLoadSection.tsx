// frontend/src/pages/HomePage/LazyLoadSection.tsx
import React from "react";
import { useInView } from "react-intersection-observer";

interface LazyLoadSectionProps {
  children: React.ReactNode;
  placeholder: React.ReactNode;
}

const LazyLoadSection: React.FC<LazyLoadSectionProps> = ({
  children,
  placeholder,
}) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: "200px 0px",
  });

  return <div ref={ref}>{inView ? children : placeholder}</div>;
};

export default LazyLoadSection;
