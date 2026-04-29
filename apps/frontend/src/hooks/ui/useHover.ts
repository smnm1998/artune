import { useState } from 'react';

/**
 * 아이템의 hover 상태를 관리하는 훅
 * @returns {Object} hover 관련 상태와 핸들러
 * @returns {number|null} returns.hoveredItem - 현재 hover된 아이템의 ID
 * @returns {Function} returns.handleMouseEnter - 마우스가 아이템에 들어왔을 때 호출할 함수
 * @returns {Function} returns.handleMouseLeave - 마우스가 아이템에서 나갔을 때 호출할 함수
 * @returns {Function} returns.isHovered - 특정 아이템이 hover되었는지 확인하는 함수
 */
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
