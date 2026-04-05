// @ts-nocheck
import { useState } from "react";

function AccordionMenu(props) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleClick = index => {
    setActiveIndex(index === activeIndex ? -1 : index);
  };

  return (
    <div className={`flex w-full flex-col ${props.classes?.body}`}>
      {props.items.map((item, index) => (
        <div key={index} className={"w-full"}>
          <button
            className={`flex cursor-pointer flex-row justify-between px-3 py-6 ${props.classes?.header}`}
            onClick={() => handleClick(index)}
          >
            <div className="">{item.title}</div>
            <div className="">{activeIndex === index ? "-" : "+"}</div>
          </button>
          <div
            className={` ${activeIndex === index ? "block" : "hidden"} ${
              item?.classes?.content || props.classes?.content
            }`}
          >
            {item.content}
          </div>
        </div>
      ))}
    </div>
  );
}

export default AccordionMenu;
