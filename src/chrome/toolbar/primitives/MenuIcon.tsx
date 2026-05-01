const MenuItem = ({ tooltip, onClick, children, animate = false }) => (
  <button
    type="button"
    className="hover:bg-primary hover:text-primary-content cursor-pointer rounded-md px-1 py-0.5 text-xs transition-transform active:scale-90"
    onClick={onClick}
  >
    {children}
  </button>
);

export default MenuItem;
