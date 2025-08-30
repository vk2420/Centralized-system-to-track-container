import React from 'react';
import { useParams } from 'react-router-dom';

const ContainerDetail = () => {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Container Details</h2>
        <p className="mt-1 text-sm text-gray-500">
          View detailed information about container {id}
        </p>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <p className="text-gray-500 text-center py-8">
          Container detail component will be implemented here showing:
          <br />
          - Container information
          <br />
          - Status history
          <br />
          - Change log
          <br />
          - Actions (Edit, Delete)
        </p>
      </div>
    </div>
  );
};

export default ContainerDetail;