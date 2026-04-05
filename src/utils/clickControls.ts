export interface ClickControl {
  type: "click" | "hover";
  direction: "show" | "hide" | "toggle" | "tab";
  value: string; // Element ID to target
  method?: "class" | "style"; // Use CSS classes or inline styles (default: "class")
  group?: string; // Tab group name — all elements with data-tab-group={group} are hidden, then value is shown
}

/**
 * Adds click control functionality to a component prop object
 * Handles hover/click interactions to show/hide elements by ID
 */
export function addClickControls(
  prop: any,
  click: ClickControl | undefined,
  enabled: boolean,
  existingOnClick?: (e: any) => void
) {
  if (!click?.type || !click?.value) return;

  const method = click.method || "class";

  // Helper function to show/hide element
  const showElement = (element: HTMLElement) => {
    if (method === "style") {
      element.style.display = "block";
    } else {
      element.classList.remove("hidden");
    }
  };

  const hideElement = (element: HTMLElement) => {
    if (method === "style") {
      element.style.display = "none";
    } else {
      element.classList.add("hidden");
    }
  };

  const toggleElement = (element: HTMLElement) => {
    if (method === "style") {
      element.style.display = element.style.display === "none" ? "block" : "none";
    } else {
      if (element.classList.contains("hidden")) {
        element.classList.remove("hidden");
      } else {
        element.classList.add("hidden");
      }
    }
  };

  // Add hover functionality
  if (click.type === "hover") {
    prop.onMouseEnter = () => {
      if (enabled) return;

      const element = document.getElementById(click.value);
      if (!element) return;

      if (element.hasAttribute("data-modal")) {
        element.dispatchEvent(new CustomEvent("pagehub:modal", {
          detail: { action: "open" },
          bubbles: false,
        }));
        return;
      }

      if (click.direction === "show") {
        showElement(element);
      } else if (click.direction === "hide") {
        hideElement(element);
      } else {
        toggleElement(element);
      }
    };

    prop.onMouseLeave = () => {
      if (enabled) return;

      const element = document.getElementById(click.value);
      if (!element) return;

      if (element.hasAttribute("data-modal")) {
        element.dispatchEvent(new CustomEvent("pagehub:modal", {
          detail: { action: "close" },
          bubbles: false,
        }));
        return;
      }

      if (click.direction === "show") {
        hideElement(element);
      } else if (click.direction === "hide") {
        showElement(element);
      } else {
        // For toggle, we don't revert on mouse leave
      }
    };
  }

  // Add click functionality
  if (click.type === "click") {
    prop.onClick = (e: any) => {
      if (enabled) return;

      // If there's an existing onClick (like for URL), call it first
      if (existingOnClick) {
        existingOnClick(e);
      }

      const element = document.getElementById(click.value);
      if (!element) return;

      // Modal intercept: dispatch event instead of toggling visibility
      if (element.hasAttribute("data-modal")) {
        const action = click.direction === "show" ? "open"
          : click.direction === "hide" ? "close"
          : "toggle";
        element.dispatchEvent(new CustomEvent("pagehub:modal", {
          detail: { action },
          bubbles: false,
        }));
        return;
      }

      if (click.direction === "tab") {
        // Tab behavior: hide all panels in the group, show the target, update active button state
        const group = click.group || click.value;

        // Hide all panels in this tab group
        const panels = document.querySelectorAll(`[data-tab-group="${group}"]`);
        panels.forEach((panel) => hideElement(panel as HTMLElement));

        // Show the target panel
        showElement(element);

        // Update active state on sibling buttons: find the parent ButtonList and toggle active class
        const button = e.currentTarget as HTMLElement;
        const buttonParent = button?.parentElement;
        if (buttonParent) {
          // Remove active state from all sibling buttons
          buttonParent.querySelectorAll("[data-tab-button]").forEach((btn) => {
            (btn as HTMLElement).setAttribute("data-tab-active", "false");
            (btn as HTMLElement).style.opacity = "0.6";
          });
          // Set active state on clicked button
          button.setAttribute("data-tab-active", "true");
          button.style.opacity = "1";
        }
      } else if (click.direction === "show") {
        showElement(element);
      } else if (click.direction === "hide") {
        hideElement(element);
      } else {
        toggleElement(element);
      }
    };
  }
}
