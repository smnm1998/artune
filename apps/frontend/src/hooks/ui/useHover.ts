import { useState } from 'react';

/** 목록에서 마우스가 올라간 항목 하나를 기억한다 — isHovered(id)로 확인 */
function useHover<T = string>() {
  const [hoveredItem, setHoveredItem] = useState<T | null>(null);

  const handleMouseEnter = (itemId: T) => {
    setHoveredItem(itemId);
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
  };

  const isHovered = (itemId: T) => hoveredItem === itemId;

  return {
    hoveredItem,
    handleMouseEnter,
    handleMouseLeave,
    isHovered,
  };
}

export default useHover;
