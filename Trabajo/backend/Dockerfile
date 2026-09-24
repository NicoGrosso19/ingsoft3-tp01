# ---- Etapa 1: build (imagen con SDK) ----
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copiar archivos de proyecto y restaurar dependencias
COPY SistemaReservasBackend.csproj .
COPY SistemaReservasBackend.Tests/SistemaReservasBackend.Tests.csproj SistemaReservasBackend.Tests/
RUN dotnet restore SistemaReservasBackend.csproj
RUN dotnet restore SistemaReservasBackend.Tests/SistemaReservasBackend.Tests.csproj

# Copiar todo el código fuente y publicar el proyecto
COPY . .
RUN dotnet publish SistemaReservasBackend.csproj -c Release -o /app/publish

# ---- Etapa 2: tests (parte del build, con el SDK y herramientas) ----
FROM build AS test
ENTRYPOINT ["dotnet", "test", "SistemaReservasBackend.Tests/SistemaReservasBackend.Tests.csproj", \
            "/p:CollectCoverage=true", "/p:Threshold=50", "/p:ThresholdType=line", \
            "/p:Exclude=[SistemaReservasBackend]Program*%2c[SistemaReservasBackend]SistemaReservasBackend.Models.*%2c[SistemaReservasBackend]SistemaReservasBackend.DTOs.*", \
            "--logger", "trx;LogFileName=tests.trx", \
            "--results-directory", "/out"]

# ---- Etapa 3: runtime (imagen mínima, sin SDK) ----
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Definir el puerto de escucha
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "SistemaReservasBackend.dll"]
