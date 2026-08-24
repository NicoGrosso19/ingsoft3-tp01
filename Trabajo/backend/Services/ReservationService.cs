using System.Text.RegularExpressions;
using Npgsql;
using SistemaReservasBackend.DTOs;
using SistemaReservasBackend.Models;

namespace SistemaReservasBackend.Services;

public class ReservationService : IReservationService
{
    private readonly IConfiguration _configuration;
    private static readonly List<Reservation> MockReservations = new()
    {
        new Reservation
        {
            Id = 1,
            UserName = "Juan Pérez",
            UserEmail = "juan@example.com",
            DateTime = DateTime.UtcNow.AddDays(1).ToString("yyyy-MM-ddTHH:30:00.000Z"),
            Status = "CONFIRMADO",
            CreatedAt = DateTime.UtcNow.ToString("o")
        },
        new Reservation
        {
            Id = 2,
            UserName = "Maria Gomez",
            UserEmail = "maria@example.com",
            DateTime = DateTime.UtcNow.AddDays(2).ToString("yyyy-MM-ddTHH:00:00.000Z"),
            Status = "PENDIENTE",
            CreatedAt = DateTime.UtcNow.ToString("o")
        }
    };

    public ReservationService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    private string GetConnectionString()
    {
        // 1. Si existe la variable ConnectionStrings__Default la usamos directamente
        var envConn = Environment.GetEnvironmentVariable("ConnectionStrings__Default");
        if (!string.IsNullOrWhiteSpace(envConn))
        {
            return envConn;
        }

        // 2. Si existe la variable DB_HOST (como en docker-compose: DB_HOST=db) la usamos
        var envHost = Environment.GetEnvironmentVariable("DB_HOST");
        if (!string.IsNullOrWhiteSpace(envHost))
        {
            var envPort = Environment.GetEnvironmentVariable("DB_PORT") ?? _configuration["DB_PORT"] ?? "5432";
            var envDb = Environment.GetEnvironmentVariable("DB_NAME") ?? _configuration["DB_NAME"] ?? "reservas";
            var envUser = Environment.GetEnvironmentVariable("DB_USER") ?? _configuration["DB_USER"] ?? "postgres";
            var envPass = Environment.GetEnvironmentVariable("DB_PASSWORD") ?? _configuration["DB_PASSWORD"] ?? "postgres";
            return $"Host={envHost};Port={envPort};Database={envDb};Username={envUser};Password={envPass};Timeout=3;";
        }

        // 3. Si no hay variables de entorno, usamos appsettings.json o fallback a localhost
        return _configuration.GetConnectionString("Default") 
               ?? "Host=localhost;Port=5432;Database=reservas;Username=postgres;Password=postgres;Timeout=3;";
    }

    private static bool IsValidEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email)) return false;
        var emailRegex = new Regex(@"^[^\s@]+@[^\s@]+\.[^\s@]+$", RegexOptions.Compiled);
        return emailRegex.IsMatch(email.Trim());
    }

    private static async Task EnsureTableCreatedAsync(NpgsqlConnection conn)
    {
        var sql = @"
            CREATE TABLE IF NOT EXISTS reservations (
                id SERIAL PRIMARY KEY,
                user_name VARCHAR(255) NOT NULL,
                user_email VARCHAR(255) NOT NULL,
                date_time VARCHAR(255) NOT NULL,
                status VARCHAR(50) NOT NULL,
                created_at VARCHAR(255) NOT NULL
            );";
        await using var cmd = new NpgsqlCommand(sql, conn);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<(int StatusCode, ApiResponse<IEnumerable<Reservation>> Response)> GetReservationsAsync()
    {
        try
        {
            await using var conn = new NpgsqlConnection(GetConnectionString());
            await conn.OpenAsync();
            await EnsureTableCreatedAsync(conn);

            await using var cmd = new NpgsqlCommand("SELECT id, user_name, user_email, date_time, status, created_at FROM reservations ORDER BY date_time ASC", conn);
            await using var reader = await cmd.ExecuteReaderAsync();

            var list = new List<Reservation>();
            while (await reader.ReadAsync())
            {
                list.Add(new Reservation
                {
                    Id = reader.GetInt32(0),
                    UserName = reader.GetString(1),
                    UserEmail = reader.GetString(2),
                    DateTime = reader.GetValue(3).ToString() ?? string.Empty,
                    Status = reader.GetString(4),
                    CreatedAt = reader.GetValue(5).ToString() ?? string.Empty
                });
            }

            return (200, new ApiResponse<IEnumerable<Reservation>> { Success = true, Data = list });
        }
        catch (Exception ex)
        {
            // Fallback a memoria si la base de datos no está disponible
            return (200, new ApiResponse<IEnumerable<Reservation>>
            {
                Success = true,
                Data = MockReservations,
                Warning = $"Error DB: {ex.Message}"
            });
        }
    }

    public async Task<(int StatusCode, ApiResponse<Reservation> Response)> CreateReservationAsync(CreateReservationDto dto)
    {
        // --- REGLA 2 (R2): Validación de Nombre y Email ---
        if (string.IsNullOrWhiteSpace(dto.UserName))
        {
            return (400, new ApiResponse<Reservation>
            {
                Success = false,
                Code = "R2_INVALID_NAME",
                Message = "Regla 2 (R2): El nombre del usuario es obligatorio y no puede estar vacío."
            });
        }

        if (!IsValidEmail(dto.UserEmail))
        {
            return (400, new ApiResponse<Reservation>
            {
                Success = false,
                Code = "R2_INVALID_EMAIL",
                Message = "Regla 2 (R2): Debe proporcionar un correo electrónico válido."
            });
        }

        // --- REGLA 1 (R1): Fecha futura e intervalo de 30 minutos ---
        if (string.IsNullOrWhiteSpace(dto.DateTime))
        {
            return (400, new ApiResponse<Reservation>
            {
                Success = false,
                Code = "R1_REQUIRED_DATE",
                Message = "Regla 1 (R1): La fecha y hora son obligatorias."
            });
        }

        if (!DateTime.TryParse(dto.DateTime, out var parsedDate))
        {
            return (400, new ApiResponse<Reservation>
            {
                Success = false,
                Code = "R1_INVALID_DATE_FORMAT",
                Message = "Regla 1 (R1): Formato de fecha y hora inválido."
            });
        }

        var utcDate = parsedDate.ToUniversalTime();
        if (utcDate <= DateTime.UtcNow)
        {
            return (400, new ApiResponse<Reservation>
            {
                Success = false,
                Code = "R1_PAST_DATE",
                Message = "Regla 1 (R1): La fecha y hora de la reserva deben ser en el futuro."
            });
        }

        if (utcDate.Minute % 30 != 0 || utcDate.Second != 0)
        {
            return (400, new ApiResponse<Reservation>
            {
                Success = false,
                Code = "R1_INVALID_INTERVAL",
                Message = "Regla 1 (R1): Los turnos deben reservarse en intervalos exactos de 30 minutos (ej. 10:00, 10:30)."
            });
        }

        var formattedDateTime = utcDate.ToString("yyyy-MM-ddTHH:mm:ss.fffZ");
        var targetDateStr = utcDate.ToString("yyyy-MM-dd");

        // Cargar reservas activas desde DB o Memoria
        List<Reservation> activeReservations = new();
        bool isDb = true;

        try
        {
            await using var conn = new NpgsqlConnection(GetConnectionString());
            await conn.OpenAsync();
            await EnsureTableCreatedAsync(conn);

            await using var cmd = new NpgsqlCommand("SELECT id, user_name, user_email, date_time, status, created_at FROM reservations WHERE status IN ('PENDIENTE', 'CONFIRMADO')", conn);
            await using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                activeReservations.Add(new Reservation
                {
                    Id = reader.GetInt32(0),
                    UserName = reader.GetString(1),
                    UserEmail = reader.GetString(2),
                    DateTime = reader.GetValue(3).ToString() ?? string.Empty,
                    Status = reader.GetString(4),
                    CreatedAt = reader.GetValue(5).ToString() ?? string.Empty
                });
            }
        }
        catch
        {
            isDb = false;
            activeReservations = MockReservations.Where(r => r.Status != "CANCELADO").ToList();
        }

        // --- REGLA 3 (R3): Evitar solapamiento de horarios ---
        var overlap = activeReservations.FirstOrDefault(r =>
        {
            if (DateTime.TryParse(r.DateTime, out var dt))
            {
                return dt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ") == formattedDateTime;
            }
            return r.DateTime == formattedDateTime;
        });

        if (overlap != null)
        {
            return (409, new ApiResponse<Reservation>
            {
                Success = false,
                Code = "R3_SCHEDULE_OVERLAP",
                Message = "Regla 3 (R3): Ya existe un turno activo agendado para ese horario exacto."
            });
        }

        // --- REGLA 6 (R6): Máximo 3 turnos activos por usuario al día ---
        var userDailyActiveCount = activeReservations.Count(r =>
        {
            var emailMatch = string.Equals(r.UserEmail, dto.UserEmail!.Trim(), StringComparison.OrdinalIgnoreCase);
            if (DateTime.TryParse(r.DateTime, out var dt))
            {
                return emailMatch && dt.ToUniversalTime().ToString("yyyy-MM-dd") == targetDateStr;
            }
            return emailMatch;
        });

        if (userDailyActiveCount >= 3)
        {
            return (422, new ApiResponse<Reservation>
            {
                Success = false,
                Code = "R6_MAX_DAILY_RESERVATIONS",
                Message = "Regla 6 (R6): El usuario ha alcanzado el límite máximo de 3 turnos activos para este día."
            });
        }

        var newRes = new Reservation
        {
            UserName = dto.UserName!.Trim(),
            UserEmail = dto.UserEmail!.Trim().ToLowerInvariant(),
            DateTime = formattedDateTime,
            Status = "PENDIENTE",
            CreatedAt = DateTime.UtcNow.ToString("o")
        };

        if (isDb)
        {
            try
            {
                await using var conn = new NpgsqlConnection(GetConnectionString());
                await conn.OpenAsync();

                var sql = @"INSERT INTO reservations (user_name, user_email, date_time, status, created_at)
                            VALUES (@uName, @uEmail, @dTime, @status, @cAt)
                            RETURNING id;";

                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("uName", newRes.UserName);
                cmd.Parameters.AddWithValue("uEmail", newRes.UserEmail);
                cmd.Parameters.AddWithValue("dTime", newRes.DateTime);
                cmd.Parameters.AddWithValue("status", newRes.Status);
                cmd.Parameters.AddWithValue("cAt", newRes.CreatedAt);

                var insertedId = Convert.ToInt32(await cmd.ExecuteScalarAsync());
                newRes.Id = insertedId;

                return (201, new ApiResponse<Reservation> { Success = true, Data = newRes });
            }
            catch (Exception ex)
            {
                return (500, new ApiResponse<Reservation> { Success = false, Message = "Error en la base de datos", Error = ex.Message });
            }
        }
        else
        {
            newRes.Id = MockReservations.Count + 1;
            MockReservations.Add(newRes);
            return (201, new ApiResponse<Reservation> { Success = true, Data = newRes });
        }
    }

    public async Task<(int StatusCode, ApiResponse<Reservation> Response)> UpdateStatusAsync(int id, UpdateStatusDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.NewStatus))
        {
            return (400, new ApiResponse<Reservation> { Success = false, Message = "Debe proporcionar un nuevo estado." });
        }

        Reservation? existing = null;
        bool isDb = true;

        try
        {
            await using var conn = new NpgsqlConnection(GetConnectionString());
            await conn.OpenAsync();
            await EnsureTableCreatedAsync(conn);

            await using var cmd = new NpgsqlCommand("SELECT id, user_name, user_email, date_time, status, created_at FROM reservations WHERE id = @id", conn);
            cmd.Parameters.AddWithValue("id", id);

            await using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                existing = new Reservation
                {
                    Id = reader.GetInt32(0),
                    UserName = reader.GetString(1),
                    UserEmail = reader.GetString(2),
                    DateTime = reader.GetValue(3).ToString() ?? string.Empty,
                    Status = reader.GetString(4),
                    CreatedAt = reader.GetValue(5).ToString() ?? string.Empty
                };
            }
        }
        catch
        {
            isDb = false;
            existing = MockReservations.FirstOrDefault(r => r.Id == id);
        }

        if (existing == null)
        {
            return (404, new ApiResponse<Reservation> { Success = false, Message = "Reserva no encontrada." });
        }

        // --- REGLA 4 (R4): Transición de estado prohibida desde Cancelado ---
        if (existing.Status == "CANCELADO")
        {
            return (400, new ApiResponse<Reservation>
            {
                Success = false,
                Code = "R4_FORBIDDEN_TRANSITION",
                Message = "Regla 4 (R4): Una reserva en estado CANCELADO no puede cambiar a ningún otro estado."
            });
        }

        // --- REGLA 5 (R5): Bloqueo de cancelación si faltan < 2hs ---
        if (dto.NewStatus.ToUpperInvariant() == "CANCELADO")
        {
            if (DateTime.TryParse(existing.DateTime, out var resDateTime))
            {
                var timeDifference = resDateTime.ToUniversalTime() - DateTime.UtcNow;
                if (timeDifference < TimeSpan.FromHours(2))
                {
                    return (422, new ApiResponse<Reservation>
                    {
                        Success = false,
                        Code = "R5_CANCELLATION_LOCKED",
                        Message = "Regla 5 (R5): No se puede cancelar la reserva si faltan menos de 2 horas para el turno."
                    });
                }
            }
        }

        existing.Status = dto.NewStatus.ToUpperInvariant();

        if (isDb)
        {
            try
            {
                await using var conn = new NpgsqlConnection(GetConnectionString());
                await conn.OpenAsync();

                await using var cmd = new NpgsqlCommand("UPDATE reservations SET status = @status WHERE id = @id", conn);
                cmd.Parameters.AddWithValue("status", existing.Status);
                cmd.Parameters.AddWithValue("id", id);
                await cmd.ExecuteNonQueryAsync();

                return (200, new ApiResponse<Reservation> { Success = true, Data = existing });
            }
            catch (Exception ex)
            {
                return (500, new ApiResponse<Reservation> { Success = false, Error = ex.Message });
            }
        }
        else
        {
            return (200, new ApiResponse<Reservation> { Success = true, Data = existing });
        }
    }
}
