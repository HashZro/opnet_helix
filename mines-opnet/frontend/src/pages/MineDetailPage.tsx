import { useParams } from 'react-router-dom';

export function MineDetailPage() {
    const { address } = useParams<{ address: string }>();
    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Mine Detail</h1>
            <p className="text-gray-400">Address: {address}</p>
        </div>
    );
}
