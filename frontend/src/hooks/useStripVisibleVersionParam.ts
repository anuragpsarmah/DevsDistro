import { useEffect } from "react";
import { router } from "@/AppRoutes";

export const useStripVisibleVersionParam = () => {
  useEffect(() => {
    const stripVisibleVersionParam = ({
      pathname,
      search,
      hash,
    }: {
      pathname: string;
      search: string;
      hash: string;
    }) => {
      const searchParams = new URLSearchParams(search);

      if (!searchParams.has("v")) return;

      searchParams.delete("v");

      const nextSearch = searchParams.toString();
      const nextUrl = `${pathname}${nextSearch ? `?${nextSearch}` : ""}${hash}`;

      void router.navigate(nextUrl, {
        replace: true,
        preventScrollReset: true,
      });
    };

    stripVisibleVersionParam(router.state.location);

    const unsubscribe = router.subscribe((state) => {
      stripVisibleVersionParam(state.location);
    });

    return unsubscribe;
  }, []);
};
