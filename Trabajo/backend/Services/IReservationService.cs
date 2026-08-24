using SistemaReservasBackend.DTOs;
using SistemaReservasBackend.Models;

namespace SistemaReservasBackend.Services;

public interface IReservationService
{
    Task<(int StatusCode, ApiResponse<IEnumerable<Reservation>> Response)> GetReservationsAsync();
    Task<(int StatusCode, ApiResponse<Reservation> Response)> CreateReservationAsync(CreateReservationDto dto);
    Task<(int StatusCode, ApiResponse<Reservation> Response)> UpdateStatusAsync(int id, UpdateStatusDto dto);
}
