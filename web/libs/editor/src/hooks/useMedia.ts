import { useEffect, useState } from "react";

export const useMedia = (query: string) => {
  const [match, setMatch] = useState(window.matchMedia(query));

  useEffect(() => {
    const handleWindowResize = () => {
      setMatch(window.matchMedia(query));
    };

    window.addEventListener("resize", handleWindowResize);

    return () => window.removeEventListener("resize", handleWindowResize);
  }, []);

  useEffect(() => {
    setMatch(window.matchMedia(query));
  }, [query]);

  return match;
};
