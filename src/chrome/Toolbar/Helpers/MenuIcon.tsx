
const MenuItem = ({ tooltip, onClick, children, animate = false }) => (
  <button
    type="button"
    className="cursor-pointer rounded-lg px-1 py-0.5 text-xs hover:bg-primary hover:text-primary-content active:scale-90 transition-transform"
    onClick={onClick}
  >
    {children}
  </button>
);

export default MenuItem;
