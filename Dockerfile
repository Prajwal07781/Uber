FROM eclipse-temurin:17-jdk AS build

WORKDIR /app
COPY . .

RUN cd backend && chmod +x mvnw && ./mvnw clean package -DskipTests

FROM eclipse-temurin:17-jre

WORKDIR /app
COPY --from=build /app/backend/target/uber-java-fullstack-0.0.1-SNAPSHOT.jar app.jar

ENV PORT=10000
EXPOSE 10000

CMD ["java", "-jar", "app.jar"]
