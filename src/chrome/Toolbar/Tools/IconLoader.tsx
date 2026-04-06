import Image from "next/image";

const placeholder =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mOUlZOtBwABkQDZtOsNkwAAAABJRU5ErkJggg==";

export const IconLoader = ({ icon }) => {
  // If icon is SVG content (starts with <), render it directly
  if (typeof icon === "string" && icon.startsWith("<")) {
    return (
      <div style={{ width: "24px", height: "24px" }} dangerouslySetInnerHTML={{ __html: icon }} />
    );
  }

  // Otherwise, treat as URL and load with Image component
  return (
    <Image
      src={`${icon}`}
      alt={""}
      width="0"
      height="0"
      sizes="100vw"
      style={{ width: "24px", height: "24px" }}
      loading="lazy"
      blurDataURL={placeholder}
      placeholder="blur"
    />
  );
};

export default IconLoader;
