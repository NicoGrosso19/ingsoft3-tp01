# ---- Etapa 1: build (imagen con SDK) ----
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copiar el archivo .csproj y restaurar dependencias
COPY SistemaReservasBackend.csproj .
RUN dotnet restore SistemaReservasBackend.csproj

# Copiar todo el código fuente y publicar el proyecto
COPY . .
RUN dotnet publish SistemaReservasBackend.csproj -c Release -o /app/publish

# ---- Etapa 2: runtime (imagen mínima, sin SDK) ----
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Definir el puerto de escucha (alineado con la variable PORT que lee tu Program.cs)
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "SistemaReservasBackend.dll"]
