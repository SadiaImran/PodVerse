import { AlertTriangle, X } from "lucide-react";

const DeleteConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Delete Item?",
  message = "Are you sure you want to delete this item? This action cannot be undone.",
  itemName = "",
  isLoading = false,
  confirmText = "Delete",
  cancelText = "Cancel"
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
      onClick={() => !isLoading && onClose()}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          style={{ opacity: isLoading ? 0.5 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
        >
          <X size={20} style={{ color: '#6A6A6A' }} />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#fef2f2' }}>
            <AlertTriangle size={32} style={{ color: '#ef4444' }} />
          </div>
        </div>

        {/* Text */}
        <h3 className="text-xl font-bold text-center mb-2" style={{ color: '#1C1C1C' }}>
          {title}
        </h3>
        <p className="text-sm text-center mb-6" style={{ color: '#6A6A6A' }}>
          {message}
          {itemName && (
            <span className="font-semibold block mt-2" style={{ color: '#1C1C1C' }}>
              "{itemName}"
            </span>
          )}
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-xl font-semibold text-sm transition-all shadow-sm"
            style={{ 
              backgroundColor: isLoading ? '#d1d5db' : '#6057C7', 
              color: '#F9F5EB',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.target.style.backgroundColor = '#2F2867';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.target.style.backgroundColor = '#6057C7';
              }
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-xl font-semibold text-sm transition-all shadow-sm"
            style={{ 
              backgroundColor: isLoading ? '#9ca3af' : '#ef4444', 
              color: '#ffffff',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.target.style.backgroundColor = '#dc2626';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.target.style.backgroundColor = '#ef4444';
              }
            }}
          >
            {isLoading ? 'Deleting...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;

