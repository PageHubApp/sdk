import { useEffect } from "react";

export const useDefaultTab = (
  head: any[],
  activeTab: string,
  setActiveTab: (t: string) => void
) => {
  useEffect(() => {
    if (!head || head.length === 0) return;
    const activeTabExists = head.some((tab: any) => tab.title === activeTab);
    if (!activeTab || !activeTabExists) {
      if (head[0]?.title) setActiveTab(head[0].title);
    }
  }, [head, activeTab, setActiveTab]);
};
