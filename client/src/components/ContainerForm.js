import React from 'react';
import { useParams } from 'react-router-dom';

const ContainerForm = () => {
  const { id } = useParams();
  const isEditing = !!id;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Container' : 'Add New Container'}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {isEditing ? 'Update container information' : 'Create a new container entry'}
        </p>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <p className="text-gray-500 text-center py-8">
          Container form component will be implemented here with fields for:
          <br />
          - Container Number
          <br />
          - Container Type (Mattress, Sofa, Dining, Furniture)
          <br />
          - Source (CDC, Dammam Port, Jeddah Port, Local PO)
          <br />
          - Status
          <br />
          - Dates (Planned, Expected Arrival, Actual Arrival)
          <br />
          - Notes
        </p>
      </div>
    </div>
  );
};

export default ContainerForm;