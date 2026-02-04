"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export default function UsersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await api.get("/admin/users", {
        params: { page: 1, limit: 50 },
      });
      return response.data;
    },
  });

  const users = data?.data || [];

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      suspended: "bg-red-100 text-red-800",
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[status] || badges.active}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Users</h1>
        <p className="dashboard-subtitle">Manage system users and administrators</p>
      </div>

      {/* Desktop Table */}
      <div className="table-container">
        <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Status</th>
                <th>Phone</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user: any) => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-600 font-semibold">
                          {user.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{user.email}</div>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {user.roles?.map((role: any) => (
                        <span
                          key={role.id}
                          className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded"
                        >
                          {role.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>{getStatusBadge(user.status || "active")}</td>
                  <td>
                    <div className="text-sm text-gray-600">{user.phone || "-"}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(user.createdAt), {
                        addSuffix: true,
                        locale: idLocale,
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="table-mobile-cards">
          {users.map((user: any) => (
            <div key={user.id} className="table-card">
              <div className="table-card-header">
                <div className="table-card-header-left">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-600 font-semibold">
                        {user.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="table-card-header-title">{user.name}</div>
                      <div className="table-card-header-subtitle">{user.email}</div>
                    </div>
                  </div>
                </div>
                {getStatusBadge(user.status || "active")}
              </div>

              <div className="table-card-row">
                <span className="table-card-row-label">Roles</span>
                <span className="table-card-row-value">
                  <div className="flex flex-wrap gap-1 justify-end">
                    {user.roles?.map((role: any) => (
                      <span
                        key={role.id}
                        className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded"
                      >
                        {role.name}
                      </span>
                    ))}
                  </div>
                </span>
              </div>

              <div className="table-card-row">
                <span className="table-card-row-label">Phone</span>
                <span className="table-card-row-value">{user.phone || "-"}</span>
              </div>

              <div className="table-card-row">
                <span className="table-card-row-label">Joined</span>
                <span className="table-card-row-value">
                  {formatDistanceToNow(new Date(user.createdAt), {
                    addSuffix: true,
                    locale: idLocale,
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>

      {users.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No users found</p>
        </div>
      )}
    </div>
  );
}
