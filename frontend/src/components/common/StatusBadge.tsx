// frontend/src/components/common/StatusBadge.tsx

import React from 'react';
import { SummaryStatus } from '../../types/apiTypes';

interface StatusBadgeProps {
    status: SummaryStatus | 'Parsed';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    let colorClass = '';
    let text = '';

    switch (status) {
        case 'queued':
            colorClass = 'bg-status-queued text-white';
            text = 'В очереди';
            break;
        case 'running':
            colorClass = 'bg-status-running text-white animate-pulse';
            text = 'Обработка...';
            break;
        case 'done':
            colorClass = 'bg-status-done text-white';
            text = 'Готово';
            break;
        case 'failed':
            colorClass = 'bg-status-failed text-white';
            text = 'Ошибка';
            break;
        case 'Parsed':
            colorClass = 'bg-gray-400 text-white';
            text = 'Распарсен';
            break;
        default:
            colorClass = 'bg-ui-neutral text-text-dark';
            text = 'Неизвестно';
    }

    return (
        <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium ${colorClass}`}>
      {text}
    </span>
    );
};

export default StatusBadge;